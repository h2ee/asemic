"""경사면 덮개 (AL5052 1.5t) — STEP / 전개도 DXF / 견적 도면 PDF 생성.

입력:  ../panel.svg   (자르기 — 선으로 된 원·타원·사각형)
       ../marking.svg (마킹 — 채워진 도형)
       SVG 단위는 Illustrator pt (1pt = 25.4/72 mm). 360 x 260 = 경사면.
       SVG 위쪽(v=0) = 경사면 위 끝(턴테이블 쪽), 아래쪽 = 관람객 쪽. 바깥에서 본 모습.

치수 기준: 판의 **안쪽 면(프레임에 닿는 면)**. 꺾이는 곳의 기준점은 안쪽 면 연장선이 만나는
가상 꼭짓점(mold line) = 프레임 프로파일 바깥 면 연장선이 만나는 점. 그래서 경사면 260이
견적 도면의 260과 같고, SVG 구멍 좌표를 그대로 쓴다.

실행: python make_cover.py   (build123d, ezdxf, svgelements, matplotlib 필요)
"""
import math
import re
from pathlib import Path

import ezdxf
import numpy as np
from svgelements import Path as SvgPath

HERE = Path(__file__).resolve().parent
PANEL_SVG = HERE.parent / 'panel.svg'
MARK_SVG = HERE.parent / 'marking.svg'
OUT = HERE

PT = 25.4 / 72  # svg 단위 → mm

# ── 치수 (mm) ──
T = 1.5          # 판 두께 (예전 2.0 — t2는 안쪽 R20~150만 견적돼 브라켓 R15를 못 맞춤. 1.5t는 R10~150)
R = 15.0         # 안쪽 절곡 R — 최대값 = 브라켓 둥근 부분 R15와 같은 중심(동심). 이보다 크면 브라켓을 누른다
K = 0.50         # 중립축 계수 (R/t 큼 → 0.5 근처; R=t면 0.4). 업체가 자기 값으로 전개도를 다시 뽑는다
W = 360.0        # 폭
SLOPE = 260.0    # 경사면 (안쪽 면 꼭짓점~꼭짓점)
WING = 30.0      # 위 날개 (수평, 아크릴 밑)
LOW = 30.0       # 아래 날개 (수직, 정면 기둥 위 브라켓 덮음)
ANG = 45.0       # 각 절곡 각도 (꺾이는 양)

th = math.radians(ANG)
SB = R * math.tan(th / 2)               # 꼭짓점 → 절곡 시작점(안쪽 면)
BA = th * (R + K * T)                   # 중립축 호 길이
FLAT_WING = WING - SB
FLAT_SLOPE = SLOPE - 2 * SB
FLAT_LOW = LOW - SB
FLAT_L = FLAT_WING + BA + FLAT_SLOPE + BA + FLAT_LOW


def v_to_flat(v):
    """경사면 좌표 v(위 끝 꼭짓점에서 mm) → 전개도 Y(위 날개 끝에서 mm)."""
    return FLAT_WING + BA + (v - SB)


# ── SVG 읽기 ──
def _attrs(s):
    return dict(re.findall(r'([\w-]+)="([^"]*)"', s))


def read_cuts(fn):
    """선으로 된 도형 → [('circle', u, v, r) | ('ellipse', u, v, rx, ry) | ('rect', u, v, w, h, rr)] (mm, 중심)."""
    src = Path(fn).read_text()
    out = []
    for tag, body in re.findall(r'<(circle|ellipse|rect)\b([^>]*)/>', src):
        a = _attrs(body)
        g = lambda k: float(a.get(k, 0)) * PT
        if tag == 'circle':
            out.append(('circle', g('cx'), g('cy'), g('r')))
        elif tag == 'ellipse':
            out.append(('ellipse', g('cx'), g('cy'), g('rx'), g('ry')))
        else:
            x, y, w, h = g('x'), g('y'), g('width'), g('height')
            tr = a.get('transform', '')
            m = re.match(r'translate\(([-\d.]+)[ ,]+([-\d.]+)\)\s*rotate\(180\)', tr)
            if m:  # 180° 회전: 점 p → (tx - px, ty - py)
                tx, ty = float(m.group(1)) * PT, float(m.group(2)) * PT
                x, y = tx - x - w, ty - y - h
            elif tr:
                raise ValueError(f'처리 못 하는 transform: {tr}')
            out.append(('rect', x + w / 2, y + h / 2, w, h, g('rx')))
    return out


def read_marks(fn):
    """채워진 도형 → 닫힌 폴리라인 목록 (mm, svg 좌표). 구멍 있는 도형은 여러 고리."""
    src = Path(fn).read_text()
    loops = []
    for d in re.findall(r'<path\b[^>]*\bd="([^"]+)"', src):
        for sub in SvgPath(d).as_subpaths():
            p = SvgPath(sub)
            n = max(16, int(p.length() * PT * 4))  # 0.25mm 간격
            pts = np.asarray(p.npoint(np.linspace(0, 1, n)), dtype=float)[:, :2] * PT
            loops.append(pts)
    for body in re.findall(r'<circle\b([^>]*)/>', src):
        a = _attrs(body)
        cx, cy, r = (float(a[k]) * PT for k in ('cx', 'cy', 'r'))
        t = np.linspace(0, 2 * np.pi, 64)
        loops.append(np.c_[cx + r * np.cos(t), cy + r * np.sin(t)])
    return loops


CUTS = read_cuts(PANEL_SVG)
MARKS = read_marks(MARK_SVG)


def check_cuts():
    """구멍이 경사면 평면부(절곡 시작 전) 안에 있는지 확인."""
    lim = SB + T  # 절곡 시작점에서 판 두께만큼은 띄운다
    for c in CUTS:
        u, v = c[1], c[2]
        if c[0] == 'circle':
            hu = hv = c[3]
        elif c[0] == 'ellipse':
            hu, hv = c[3], c[4]
        else:
            hu, hv = c[3] / 2, c[4] / 2
        if u - hu < 0 or u + hu > W or v - hv < lim or v + hv > SLOPE - lim:
            print(f'  ! 경사면 평면부 밖: {c[0]} 중심 ({u:.1f}, {v:.1f})')


# ── 3D (STEP) ──
def build_step():
    from build123d import (Axis, Circle, Ellipse, Line, Plane, Pos, Rectangle, RectangleRounded,
                           FilletPolyline, export_step, extrude, make_face, Vector)
    c = math.cos(th) if ANG == 45 else None
    # 단면 (x=0 평면, y=깊이 +뒤, z=위). 원점 = 경사면 아래 꼭짓점(안쪽 면).
    s, cs = math.sin(th), math.cos(th)
    top = (SLOPE * cs, SLOPE * s)  # 45°라 sin=cos
    pin = [(0, -LOW), (0, 0), top, (top[0] + WING, top[1])]
    # 바깥 면 꼭짓점: 각 면을 바깥으로 T만큼 민 직선들의 교점
    n_front, n_slope, n_wing = (-1, 0), (-s, cs), (0, 1)

    def offset_line(p, d, n):
        return (p[0] + n[0] * T, p[1] + n[1] * T), d

    def inter(l1, l2):
        (p, d), (q, e) = l1, l2
        den = d[0] * e[1] - d[1] * e[0]
        t = ((q[0] - p[0]) * e[1] - (q[1] - p[1]) * e[0]) / den
        return (p[0] + d[0] * t, p[1] + d[1] * t)

    Lf = offset_line(pin[1], (0, 1), n_front)
    Ls = offset_line(pin[1], (cs, s), n_slope)
    Lw = offset_line(pin[2], (1, 0), n_wing)
    pout = [(-T, -LOW), inter(Lf, Ls), inter(Ls, Lw), (top[0] + WING, top[1] + T)]

    P = lambda p: (0, p[0], p[1])
    inner = FilletPolyline(*[P(p) for p in pin], radius=R)
    outer = FilletPolyline(*[P(p) for p in pout], radius=R + T)
    caps = [Line(P(pin[0]), P(pout[0])), Line(P(pin[-1]), P(pout[-1]))]
    face = make_face([*inner.edges(), *outer.edges(), *caps])
    part = extrude(face, amount=W, dir=(1, 0, 0))

    # 경사면 위 구멍: 로컬 (u, s) — u = 왼→오(바깥에서 볼 때), s = 아래 꼭짓점에서 위로
    pl = Plane(origin=(0, 0, 0), x_dir=(1, 0, 0), z_dir=(0, -s, cs))
    tools = []
    for cut in CUTS:
        u, v = cut[1], cut[2]
        loc = pl * Pos(u, SLOPE - v)
        if cut[0] == 'circle':
            sk = loc * Circle(cut[3])
        elif cut[0] == 'ellipse':
            sk = loc * Ellipse(cut[3], cut[4])
        else:
            w, h, rr = cut[3], cut[4], cut[5]
            sk = loc * (RectangleRounded(w, h, min(rr, min(w, h) / 2 - 1e-3)) if rr > 0 else Rectangle(w, h))
        tools.append(extrude(sk, amount=T * 3, both=True))
    for tl in tools:
        part = part - tl
    export_step(part, str(OUT / f'cover_slope_AL5052_{T:g}t.step'))
    bb = part.bounding_box()
    print(f'STEP: volume {part.volume / 1000:.1f} cm³ (≈{part.volume * 2.68e-3:.0f} g), '
          f'bbox {bb.size.X:.1f} x {bb.size.Y:.1f} x {bb.size.Z:.1f}')


# ── 전개도 DXF ──
def to_flat(u, v):
    """svg mm → 전개도 좌표 (x=u, y=위로+). 바깥 면에서 본 모습, 위 날개 끝이 위."""
    return u, FLAT_L - v_to_flat(v)


def build_dxf():
    doc = ezdxf.new('R2010', setup=True)
    doc.units = ezdxf.units.MM
    for name, col, lt in [('CUT', 7, 'CONTINUOUS'), ('BEND', 1, 'DASHED'),
                          ('MARK', 5, 'CONTINUOUS'), ('NOTE', 3, 'CONTINUOUS')]:
        doc.layers.add(name, color=col, linetype=lt)
    msp = doc.modelspace()
    msp.add_lwpolyline([(0, 0), (W, 0), (W, FLAT_L), (0, FLAT_L)], close=True, dxfattribs={'layer': 'CUT'})
    for cut in CUTS:
        cx, cy = to_flat(cut[1], cut[2])
        if cut[0] == 'circle':
            msp.add_circle((cx, cy), cut[3], dxfattribs={'layer': 'CUT'})
        elif cut[0] == 'ellipse':
            rx, ry = cut[3], cut[4]
            major, ratio = ((rx, 0, 0), ry / rx) if rx >= ry else ((0, ry, 0), rx / ry)
            msp.add_ellipse((cx, cy), major_axis=major, ratio=ratio, dxfattribs={'layer': 'CUT'})
        else:
            w, h, rr = cut[3], cut[4], cut[5]
            x0, y0, x1, y1 = cx - w / 2, cy - h / 2, cx + w / 2, cy + h / 2
            if rr <= 0:
                msp.add_lwpolyline([(x0, y0), (x1, y0), (x1, y1), (x0, y1)], close=True, dxfattribs={'layer': 'CUT'})
            else:  # 양끝 반원 슬롯 / 둥근 사각형 — bulge로
                rr = min(rr, w / 2, h / 2)
                b = math.tan(math.pi / 8)  # 90° 호
                pts = [(x0 + rr, y0, 0), (x1 - rr, y0, b), (x1, y0 + rr, 0), (x1, y1 - rr, b),
                       (x1 - rr, y1, 0), (x0 + rr, y1, b), (x0, y1 - rr, 0), (x0, y0 + rr, b)]
                msp.add_lwpolyline(pts, format='xyb', close=True, dxfattribs={'layer': 'CUT'})
    # 절곡선 (중립축 호의 가운데)
    y_top = FLAT_L - (FLAT_WING + BA / 2)
    y_low = FLAT_L - (FLAT_WING + BA + FLAT_SLOPE + BA / 2)
    for y, txt in [(y_top, f'BEND 45° (안쪽으로) R{R:g}'), (y_low, f'BEND 45° (안쪽으로) R{R:g}')]:
        msp.add_line((-10, y), (W + 10, y), dxfattribs={'layer': 'BEND'})
        msp.add_text(txt, height=3, dxfattribs={'layer': 'NOTE'}).set_placement((W + 12, y - 1.5))
    # 마킹 (채움)
    hatch = msp.add_hatch(color=5, dxfattribs={'layer': 'MARK'})
    hatch.set_pattern_fill('SOLID')
    hatch.dxf.hatch_style = 0  # 짝홀(odd parity) — 글자 속 구멍
    for loop in MARKS:
        pts = [to_flat(u, v) for u, v in loop]
        msp.add_lwpolyline(pts, close=True, dxfattribs={'layer': 'MARK'})
        hatch.paths.add_polyline_path(pts, is_closed=True)
    msp.add_text(f'AL5052 t{T:g}  전개 {W:g} x {FLAT_L:.2f}  (K={K}, R{R:g} 기준 — 업체 장비 값으로 재전개)',
                 height=4, dxfattribs={'layer': 'NOTE'}).set_placement((0, -10))
    doc.saveas(OUT / 'cover_slope_flat.dxf')
    print(f'DXF: 전개 {W:g} x {FLAT_L:.2f} mm, 절단 {len(CUTS)}개, 마킹 고리 {len(MARKS)}개')
    return y_top, y_low


# ── 견적 도면 PDF ──
def build_pdf(y_top, y_low):
    import matplotlib
    matplotlib.use('Agg')
    import matplotlib.pyplot as plt
    from matplotlib import font_manager
    from matplotlib.patches import Circle as MCircle, Ellipse as MEllipse, FancyBboxPatch, Polygon, Rectangle as MRect, Arc
    for f in [Path.home() / 'Library/Fonts/MonoplexKR-Regular.ttf']:
        if f.exists():
            font_manager.fontManager.addfont(str(f))
            plt.rcParams['font.family'] = font_manager.FontProperties(fname=str(f)).get_name()
    plt.rcParams['axes.unicode_minus'] = False

    fig = plt.figure(figsize=(16.54, 11.69))  # A3 가로
    fig.text(0.03, 0.955, f'경사면 덮개 — AL5052 {T:g}t, 1EA', fontsize=18)
    fig.text(0.03, 0.93, '치수 기준: 판 안쪽 면(프레임 닿는 면). 꼭짓점 = 안쪽 면 연장선 교점. 단위 mm', fontsize=10, color='#444')

    # 1) 측면 단면
    ax = fig.add_axes([0.03, 0.30, 0.30, 0.58])
    s = math.sin(th)
    top = (SLOPE * s, SLOPE * s)
    pin = np.array([(0, -LOW), (0, 0), top, (top[0] + WING, top[1])])
    ax.plot(pin[:, 0], pin[:, 1], color='#999', lw=0.8, ls='--')
    # 판 단면: 안쪽 면 경로(R 필렛)를 바깥으로 T만큼 민 띠
    def filleted(pts, r):
        out = [pts[0]]
        for i in range(1, len(pts) - 1):
            a, b, c = pts[i - 1], pts[i], pts[i + 1]
            d1 = (b - a) / np.linalg.norm(b - a); d2 = (c - b) / np.linalg.norm(c - b)
            t1, t2 = b - d1 * SB, b + d2 * SB
            nrm_in = np.array([d1[1], -d1[0]])  # 안쪽(오른쪽) — 경로가 왼쪽(바깥)으로 꺾임
            ctr = t1 + nrm_in * r
            a0 = math.atan2(*(t1 - ctr)[::-1]); a1 = math.atan2(*(t2 - ctr)[::-1])
            if a1 > a0: a1 -= 2 * math.pi
            for ang in np.linspace(a0, a1, 24):
                out.append(ctr + r * np.array([math.cos(ang), math.sin(ang)]))
        out.append(pts[-1])
        return np.array(out)
    path_in = filleted(pin.astype(float), R)
    seg_n = []
    for i in range(len(path_in)):
        a = path_in[max(i - 1, 0)]; b = path_in[min(i + 1, len(path_in) - 1)]
        d = (b - a) / np.linalg.norm(b - a)
        seg_n.append(np.array([-d[1], d[0]]))  # 왼쪽 = 바깥
    path_out = path_in + np.array(seg_n) * T
    ax.add_patch(Polygon(np.r_[path_in, path_out[::-1]], color='#333', lw=0))
    # 프레임 (참고) — 정면 기둥, 경사 프로파일, 윗면 프로파일 단면 + 브라켓 R15
    ax.add_patch(MRect((0, -LOW - 40), 30, LOW + 40 - 30.2, color='#ddd'))
    hinge1 = np.array([15, -15 * math.tan(th / 2)])
    hinge2 = np.array(top) + np.array([15 * math.tan(th / 2), -15])
    for h in (hinge1, hinge2):
        ax.add_patch(MCircle(h, 15, fill=False, ec='#bbb', lw=0.8))
    ax.text(hinge1[0] + 17, hinge1[1] + 2, '브라켓 R15\n(축 = 프로파일 중심)', fontsize=7, color='#888')
    ax.annotate('', xy=(-12, 0), xytext=(-12, -LOW), arrowprops=dict(arrowstyle='<->', lw=0.6))
    ax.text(-14, -LOW / 2, f'{LOW:g}', ha='right', va='center', fontsize=9)
    mid = np.array(top) / 2 + np.array([-s, s]) * 14
    ax.text(*mid, f'{SLOPE:g}', ha='center', va='center', rotation=45, fontsize=9)
    ax.annotate('', xy=(top[0], top[1] + 12), xytext=(top[0] + WING, top[1] + 12), arrowprops=dict(arrowstyle='<->', lw=0.6))
    ax.text(top[0] + WING / 2, top[1] + 14, f'{WING:g}', ha='center', fontsize=9)
    ax.text(34, -LOW + 2, '아래 날개\n(정면 기둥 위\n브라켓 덮음)', fontsize=7)
    ax.text(top[0] + 2, top[1] - 12, '위 날개\n(아크릴 밑)', fontsize=7)
    ax.text(top[0] * 0.15, top[1] * 0.62, '바깥 (관람객)', fontsize=8, color='#666')
    ax.text(top[0] * 0.75, top[1] * 0.35, '안쪽 (프레임)', fontsize=8, color='#666')
    ax.text(top[0] + 4, top[1] - 34, '135°', fontsize=9)
    ax.text(8, 22, '135°', fontsize=9)
    ax.set_aspect('equal'); ax.set_xlim(-30, top[0] + WING + 15); ax.set_ylim(-LOW - 45, top[1] + 30); ax.axis('off')
    ax.set_title('측면 단면 (왼쪽에서 본 모습, 폭 360)', fontsize=11, loc='left')

    # 2) 전개도
    ax = fig.add_axes([0.36, 0.06, 0.62, 0.84])
    ax.add_patch(MRect((0, 0), W, FLAT_L, fill=False, lw=1))
    for cut in CUTS:
        cx, cy = to_flat(cut[1], cut[2])
        if cut[0] == 'circle':
            ax.add_patch(MCircle((cx, cy), cut[3], fill=False, lw=0.6))
        elif cut[0] == 'ellipse':
            ax.add_patch(MEllipse((cx, cy), 2 * cut[3], 2 * cut[4], fill=False, lw=0.6))
        else:
            w, h, rr = cut[3], cut[4], cut[5]
            ax.add_patch(FancyBboxPatch((cx - w / 2 + rr, cy - h / 2 + rr), w - 2 * rr, h - 2 * rr,
                                        boxstyle=f'round,pad={rr}' if rr > 0 else 'square,pad=0', fill=False, lw=0.6))
    from matplotlib.path import Path as MPath
    verts, codes = [], []
    for loop in MARKS:
        pts = [to_flat(u, v) for u, v in loop]
        verts += pts + [pts[0]]
        codes += [MPath.MOVETO] + [MPath.LINETO] * (len(pts) - 1) + [MPath.CLOSEPOLY]
    from matplotlib.patches import PathPatch
    ax.add_patch(PathPatch(MPath(verts, codes), color='#2a6fdb', lw=0))
    for y in (y_top, y_low):
        for yy in (y - BA / 2, y + BA / 2):  # 절곡 구간 시작·끝
            ax.plot([-8, W + 8], [yy, yy], color='#d33', ls=(0, (6, 3)), lw=0.6)
        ax.text(W + 10, y, f'절곡 45°\n(뒤로 접힘) 안쪽 R{R:g}', va='center', fontsize=8, color='#d33')
    ax.text(W / 2, (FLAT_L + y_top) / 2, '위 날개 (아크릴 밑)', ha='center', va='center', fontsize=8, color='#999')
    ax.text(W / 2, y_low / 2, '아래 날개', ha='center', va='center', fontsize=8, color='#999')
    ax.annotate('', xy=(0, -10), xytext=(W, -10), arrowprops=dict(arrowstyle='<->', lw=0.6))
    ax.text(W / 2, -16, f'{W:g}', ha='center', fontsize=9)
    ax.annotate('', xy=(-30, 0), xytext=(-30, FLAT_L), arrowprops=dict(arrowstyle='<->', lw=0.6))
    ax.text(-33, FLAT_L / 2, f'{FLAT_L:.1f}\n(참고, 전개)', ha='right', va='center', fontsize=9)
    ax.set_aspect('equal'); ax.set_xlim(-75, W + 60); ax.set_ylim(-25, FLAT_L + 8); ax.axis('off')
    ax.set_title('전개도 (바깥 면에서 본 모습) — 검정 = 절단, 파랑 = 마킹, 빨강 점선 = 절곡', fontsize=11, loc='left')

    notes = [
        f'재질: AL5052-H32  t{T:g}',
        '수량: 1EA',
        f'가공: 레이저 절단 → R 절곡 2곳 (45°, 같은 방향, 안쪽 R{R:g})',
        f'  브라켓 R15와 동심으로 감쌈.',
        '표면: 비드(샌드)블라스트 → 무색 아노다이징, 무광',
        '마킹: 파란 영역 — UV 인쇄',
        f'전개 길이는 참고값(K={K}). 3D(STEP) 형상 기준으로 귀사 장비 값으로 재전개 바랍니다',
    ]
    fig.text(0.03, 0.26, '\n'.join(notes), fontsize=9.5, va='top', linespacing=1.7)
    fig.text(0.03, 0.06, f'첨부: cover_slope_AL5052_{T:g}t.step (3D) / cover_slope_flat.dxf (전개도: CUT·BEND·MARK 레이어)',
             fontsize=9, color='#444')
    fig.savefig(OUT / 'cover_slope_drawing.pdf')
    fig.savefig(OUT / 'cover_slope_drawing.png', dpi=110)
    print('PDF: cover_slope_drawing.pdf')


if __name__ == '__main__':
    print(f'SB={SB:.3f} BA={BA:.3f} 전개 길이={FLAT_L:.3f}')
    check_cuts()
    build_step()
    yt, yl = build_dxf()
    build_pdf(yt, yl)
