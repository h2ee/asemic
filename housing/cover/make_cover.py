"""경사면 덮개 (AL5052 1.5t) — STEP / 전개도 DXF / 견적 도면 PDF 생성.

입력:  ../panel.svg   (자르기 — 선으로 된 원·타원·사각형)
       ../marking.svg (마킹 — 채워진 도형)
       SVG 단위는 Illustrator pt (1pt = 25.4/72 mm). 360 x 260 = 경사면.
       SVG 위쪽(v=0) = 경사면 위 끝(턴테이블 쪽), 아래쪽 = 관람객 쪽. 바깥에서 본 모습.

치수 기준: 판의 **안쪽 면(프레임에 닿는 면)**. 꺾이는 곳의 기준점은 안쪽 면 연장선이 만나는
가상 꼭짓점(mold line). 아래 꼭짓점 = 프레임 프로파일 바깥 면 연장선이 만나는 점.
위 날개는 프레임 윗면에서 아크릴(GAP) 두께만큼 떠 있어서 위 꼭짓점은 프레임 꼭짓점보다 경사면을 따라
GAP/sin45 ≈ 4.2 위에 있다. 그래서 경사면 = 260(프레임) + 4.2이고, SVG(프레임 260 기준) 구멍은
v에 그만큼 더해 프레임에 대해 같은 자리에 둔다.

실행: python make_cover.py   (build123d, ezdxf, svgelements, matplotlib 필요)
"""
import math
import re
import sys
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
T = 1.5         # 판 두께 (예전 2.0 — t2는 안쪽 R20~150만 견적돼 브라켓 R15를 못 맞춤. 1.5t는 R10~150)
if len(sys.argv) > 1:  # python make_cover.py 1  → 1t (0.8~1.5t 모두 R10~150이라 R15 그대로)
    T = float(sys.argv[1])
TAG = f'AL5052_{T:g}t'  # 결과 파일 이름 꼬리
R = 15.0         # 안쪽 절곡 R — 최대값 = 브라켓 둥근 부분 R15와 같은 중심(동심). 이보다 크면 브라켓을 누른다
K = 0.50         # 중립축 계수 (R/t 큼 → 0.5 근처; R=t면 0.4). 업체가 자기 값으로 전개도를 다시 뽑는다
W = 360.0        # 폭
SLOPE_FRAME = 260.0  # 경사면 프레임 (프레임 꼭짓점~꼭짓점) = panel.svg 높이
LOW = 30.0       # 아래 날개 (수직, 정면 기둥 위 브라켓 덮음)
ANG = 45.0       # 각 절곡 각도 (꺾이는 양)
# 위 날개는 아크릴 위를 덮는다: 프레임 윗면 ─ 아크릴 GAP ─ 날개. 위 브라켓과 날개 사이도 GAP만큼 뜬다(옆면이라 괜찮음)
GAP = 3.0        # 아크릴 3t
WING_FRAME = 60.0  # 날개 끝 = 프레임 앞 모서리에서 60 (브라켓 30 + 뒤 프로파일 30)
# 위 날개 구멍 — 브라켓 뒤 프로파일(30~60) 가운데, 양 끝 2개. 볼트가 날개·아크릴·프로파일을 같이 조인다
WING_HOLES_U = (15.0, W - 15.0)         # 왼→오
WING_HOLE_FRAME = 45.0                  # 프레임 앞 모서리에서 뒤로 = 프로파일 중심선
WING_HOLE_D = 6.5                       # M6

th = math.radians(ANG)
DS = GAP / math.sin(th)                 # 위 꼭짓점이 프레임 꼭짓점보다 경사면 따라 위로 간 거리
DX = GAP / math.tan(th)                 # 〃 수평으로 뒤로 간 거리
SLOPE = SLOPE_FRAME + DS                # 경사면 (안쪽 면 꼭짓점~꼭짓점)
WING = WING_FRAME - DX                  # 위 날개 (수평, 위 꼭짓점에서)
WING_HOLE_IN = WING_HOLE_FRAME - DX     # 위 꼭짓점에서
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


# 직사각형 구멍 모서리 최소 R — panel.svg에서 각진(rx 0) 사각 구멍에만 준다.
# 사각 구멍은 부품 안쪽 몸통(각진 사각)에 한쪽 0.15 여유로 맞춘 것이라, 몸통 모서리가 안 걸리는 R은
# 0.15 / (1 − 1/√2) ≈ 0.5까지다. R2를 주려면 구멍을 한쪽 0.6씩 키워야 한다(앞 덮개가 가림).
# RECT_MIN_R = 2.0
RECT_MIN_R = 0.5
CUTS = [c if c[0] != 'rect' or c[5] >= RECT_MIN_R else (*c[:5], min(RECT_MIN_R, c[3] / 2, c[4] / 2))
        for c in read_cuts(PANEL_SVG)]
CUTS = [(c[0], c[1], c[2] + DS, *c[3:]) for c in CUTS]  # 프레임 꼭짓점 기준 → 위 꼭짓점 기준
MARKS = [l + (0, DS) for l in read_marks(MARK_SVG)]


def silk_groups(gap=4.0):
    """마킹 고리를 가까운 것끼리(gap mm 안) 묶어 인쇄 묶음 외곽 [(u0, v0, u1, v1)] — 경사면 좌표, 위→아래·왼→오른"""
    groups = [[(l[:, 0].min(), l[:, 1].min(), l[:, 0].max(), l[:, 1].max())] for l in MARKS]
    near = lambda a, b: not (a[2] + gap < b[0] or b[2] + gap < a[0] or a[3] + gap < b[1] or b[3] + gap < a[1])
    merged = True
    while merged:
        merged = False
        for i in range(len(groups)):
            j = next((j for j in range(i + 1, len(groups))
                      if any(near(a, b) for a in groups[i] for b in groups[j])), None)
            if j is not None:
                groups[i] += groups.pop(j)
                merged = True
                break
    out = [(min(b[0] for b in g), min(b[1] for b in g), max(b[2] for b in g), max(b[3] for b in g)) for g in groups]
    return sorted(out, key=lambda b: (round(b[1] / 10), b[0]))


SILK_GROUPS = silk_groups()


def wing_flat(u):
    """위 날개 구멍 → 전개도 좌표. 날개 평면부는 끝에서부터 길이가 그대로다."""
    return u, FLAT_L - (WING - WING_HOLE_IN)


def check_cuts():
    """구멍이 경사면 평면부(절곡 시작 전) 안에 있는지 확인."""
    lim = SB + T  # 절곡 시작점에서 판 두께만큼은 띄운다
    r = WING_HOLE_D / 2
    if WING_HOLE_IN - r < lim or WING_HOLE_IN + r > WING:
        print(f'  ! 위 날개 구멍이 평면부 밖: 꼭짓점에서 {WING_HOLE_IN:g} (평면부 {lim:.1f}~{WING:g})')
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
    for u in WING_HOLES_U:
        wl = Plane(origin=(u, top[0] + WING_HOLE_IN, top[1]), x_dir=(1, 0, 0), z_dir=(0, 0, 1))
        tools.append(extrude(wl * Circle(WING_HOLE_D / 2), amount=T * 3, both=True))
    for tl in tools:
        part = part - tl
    export_step(part, str(OUT / f'cover_slope_{TAG}.step'))
    bb = part.bounding_box()
    print(f'STEP: volume {part.volume / 1000:.1f} cm³ (≈{part.volume * 2.68e-3:.0f} g), '
          f'bbox {bb.size.X:.1f} x {bb.size.Y:.1f} x {bb.size.Z:.1f}')
    # build_silk_step(part, pl)  # 인쇄를 0.05 몸체로 얹던 방식 — 업체가 가공 형상으로 오해할 수 있어 면 색칠로 바꿈
    build_silk_face_step(part, pl)


def ink_face(out):
    """MARKS → 바깥 면 평면 위 인쇄 영역 면(짝홀 — 감싼 고리 수가 홀수면 구멍)."""
    from build123d import Polygon
    from matplotlib.path import Path as MPath
    loops = [np.asarray(l) for l in MARKS]
    paths = [MPath(l) for l in loops]
    solid, holes = [], []
    for i, l in enumerate(loops):
        depth = sum(paths[j].contains_point(l[0]) for j in range(len(loops)) if j != i)
        f = (out * Polygon(*[(u, SLOPE - v) for u, v in l[::2]], align=None)).face()
        (holes if depth % 2 else solid).append(f)
    ink = solid[0]
    for f in solid[1:]:
        ink = ink + f
    for f in holes:
        ink = ink - f
    return ink


def build_silk_face_step(part, pl):
    """덮개 한 몸체 STEP — 바깥 면을 인쇄 윤곽으로 나눠 그 면만 검정(두께 0, 형상은 그대로). 업체 전개·가공에 영향 없음."""
    from OCP.BRep import BRep_Tool
    from OCP.BRepAlgoAPI import BRepAlgoAPI_Splitter
    from OCP.BRepClass import BRepClass_FaceClassifier
    from OCP.BRepTools import BRepTools
    from OCP.TopAbs import TopAbs_IN
    from OCP.collections import List_TopoDS_Shape
    from OCP.TCollection import TCollection_ExtendedString
    from OCP.TDataStd import TDataStd_Name
    from OCP.TDocStd import TDocStd_Document
    from OCP.XCAFApp import XCAFApp_Application
    from OCP.XCAFDoc import XCAFDoc_DocumentTool, XCAFDoc_ColorSurf
    from OCP.Quantity import Quantity_Color, Quantity_TOC_RGB
    from OCP.STEPCAFControl import STEPCAFControl_Writer
    from OCP.STEPControl import STEPControl_AsIs
    from OCP.gp import gp_Pnt2d
    from build123d import Compound, Vector
    out = pl.offset(T)
    ink = ink_face(out)
    args, tools = List_TopoDS_Shape(), List_TopoDS_Shape()
    args.Append(part.wrapped)
    for f in ink.faces():
        tools.Append(f.wrapped)
    sp = BRepAlgoAPI_Splitter()
    sp.SetArguments(args); sp.SetTools(tools); sp.Build()
    assert sp.IsDone(), '면 나누기 실패'
    solids = Compound(sp.Shape()).solids()
    assert len(solids) == 1, f'몸체가 {len(solids)}개로 갈림'
    body = solids[0]

    def inside_point(f):
        """면 안쪽이 확실한 점 하나(가운데가 비어 있는 고리 면도) — UV 격자에서 첫 IN"""
        u0, u1, v0, v1 = BRepTools.UVBounds_s(f.wrapped)
        srf = BRep_Tool.Surface_s(f.wrapped)
        for a in np.linspace(0.02, 0.98, 25):
            for b in np.linspace(0.02, 0.98, 25):
                uv = (u0 + (u1 - u0) * a, v0 + (v1 - v0) * b)
                if BRepClass_FaceClassifier(f.wrapped, gp_Pnt2d(*uv), 1e-6).State() == TopAbs_IN:
                    q = srf.Value(*uv)
                    return Vector(q.X(), q.Y(), q.Z())
        return f.center()

    n = Vector(out.z_dir)
    printed = []
    for f in body.faces():
        if abs(f.normal_at(f.center()).dot(n) - 1) > 1e-6 or abs((f.center() - Vector(out.origin)).dot(n)) > 1e-4:
            continue  # 바깥 경사면 위 면만
        if f.area > 0.5 * W * SLOPE:
            continue  # 남은 큰 바깥 면
        if ink.distance_to(inside_point(f)) < 1e-4:
            printed.append(f)  # 글자 속(구멍) 조각은 여기서 빠진다

    app = XCAFApp_Application.GetApplication_s()
    doc = TDocStd_Document(TCollection_ExtendedString('MDTV-XCAF'))
    app.InitDocument(doc)
    st = XCAFDoc_DocumentTool.ShapeTool_s(doc.Main())
    ct = XCAFDoc_DocumentTool.ColorTool_s(doc.Main())
    lab = st.AddShape(body.wrapped, False)
    TDataStd_Name.Set_s(lab, TCollection_ExtendedString(f'cover_slope_{TAG}'))
    ct.SetColor(lab, Quantity_Color(0.78, 0.79, 0.81, Quantity_TOC_RGB), XCAFDoc_ColorSurf)
    black = Quantity_Color(0, 0, 0, Quantity_TOC_RGB)
    for f in printed:
        sub = st.AddSubShape(lab, f.wrapped)
        TDataStd_Name.Set_s(sub, TCollection_ExtendedString('SILK_PRINT_BLACK'))
        ct.SetColor(sub, black, XCAFDoc_ColorSurf)
    w = STEPCAFControl_Writer()
    w.SetColorMode(True); w.SetNameMode(True)
    w.Transfer(doc, STEPControl_AsIs)
    w.Write(str(OUT / f'cover_slope_silk_{TAG}.step'))
    area = sum(f.area for f in printed)
    print(f'SILK STEP: cover_slope_silk_{TAG}.step (몸체 1, 검정 면 {len(printed)}개 = {area:.0f} mm², '
          f'인쇄 영역 {ink.area:.0f} mm², 부피 {body.volume / 1000:.1f} cm³)')


# 실크 인쇄를 3D에 — 바깥 면 위에 PRINT_H 두께 판으로 얹은 별도 몸체(검정). 실제 잉크는 ~0.01–0.02
PRINT_H = 0.05


def build_silk_step(part, pl):
    """덮개 + 인쇄 몸체 어셈블리 STEP(색·이름 있음) / STL 두 개(덮개, 인쇄 — 같은 좌표, STL은 색이 없어서 나눔)."""
    from build123d import Color, Compound, Polygon, Pos, export_stl, export_step, extrude
    from matplotlib.path import Path as MPath
    out = pl.offset(T)  # 바깥 면
    loops = [np.asarray(l) for l in MARKS]
    paths = [MPath(l) for l in loops]
    solid_parts, hole_parts = [], []
    for i, l in enumerate(loops):
        depth = sum(paths[j].contains_point(l[0]) for j in range(len(loops)) if j != i)  # 짝홀: 감싼 고리 수
        pts = [(u, SLOPE - v) for u, v in l[::2]]  # 0.5mm 간격이면 충분
        body = extrude(out * Polygon(*pts, align=None), amount=PRINT_H, dir=out.z_dir)  # 감긴 방향과 상관없이 바깥으로
        (hole_parts if depth % 2 else solid_parts).append(body)
    ink = solid_parts[0]
    for b in solid_parts[1:]:
        ink = ink + b
    for b in hole_parts:
        ink = ink - b
    part.label, part.color = 'cover', Color(0.78, 0.79, 0.81)
    ink.label, ink.color = 'silk_print_black', Color(0, 0, 0)
    asm = Compound(label=f'cover_slope_silk_{TAG}', children=[part, ink])
    export_step(asm, str(OUT / f'cover_slope_silk_{TAG}.step'))
    export_stl(part, str(OUT / f'cover_slope_{TAG}.stl'))
    export_stl(ink, str(OUT / f'cover_slope_silk_print_{TAG}.stl'))
    print(f'SILK STEP: cover_slope_silk_{TAG}.step (덮개 + 인쇄 {PRINT_H:g}mm, 고리 {len(solid_parts)}+구멍 {len(hole_parts)}), '
          f'STL 2개, 인쇄 면적 {ink.volume / PRINT_H:.0f} mm²')


# ── 전개도 DXF ──
def to_flat(u, v):
    """svg mm → 전개도 좌표 (x=u, y=위로+). 바깥 면에서 본 모습, 위 날개 끝이 위."""
    return u, FLAT_L - v_to_flat(v)


def build_dxf():
    doc = ezdxf.new('R2010', setup=True)
    doc.units = ezdxf.units.MM
    for name, col, lt in [('CUT', 7, 'CONTINUOUS'), ('BEND', 1, 'DASHED'),
                          ('MARK', 5, 'CONTINUOUS'), ('SILK', 6, 'DASHED'), ('NOTE', 3, 'CONTINUOUS')]:
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
    for u in WING_HOLES_U:
        msp.add_circle(wing_flat(u), WING_HOLE_D / 2, dxfattribs={'layer': 'CUT'})
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
        # msp.add_lwpolyline(pts, close=True, dxfattribs={'layer': 'MARK'})  # 윤곽선 — 일러스트가 선 두께를 입혀 글자가 굵어져서 뺌(채움만)
        hatch.paths.add_polyline_path(pts, is_closed=True)
    # 실크 인쇄 위치 — 묶음마다 외곽 사각형 + 번호(경사면 좌표 = 왼쪽 끝·위 꼭짓점에서)
    for i, (u0, v0, u1, v1) in enumerate(SILK_GROUPS, 1):
        a, b = to_flat(u0, v0), to_flat(u1, v1)
        msp.add_lwpolyline([(a[0], a[1]), (b[0], a[1]), (b[0], b[1]), (a[0], b[1])], close=True,
                           dxfattribs={'layer': 'SILK'})
        msp.add_text(f'S{i}  X{u0:.1f} Y{v0:.1f}  {u1 - u0:.1f}x{v1 - v0:.1f}', height=2.5,
                     dxfattribs={'layer': 'SILK'}).set_placement((a[0], a[1] + 1.5))
    msp.add_text(f'AL5052 t{T:g}  전개 {W:g} x {FLAT_L:.2f}  (K={K}, R{R:g} 기준 — 업체 장비 값으로 재전개)',
                 height=4, dxfattribs={'layer': 'NOTE'}).set_placement((0, -10))
    doc.saveas(OUT / f'cover_slope_flat_{TAG}.dxf')
    print(f'DXF: 전개 {W:g} x {FLAT_L:.2f} mm, 절단 {len(CUTS)}+{len(WING_HOLES_U)}개, 마킹 고리 {len(MARKS)}개')
    return y_top, y_low


# ── UV 인쇄용 1:1 PDF ──
def build_mark_pdf():
    """마킹 채움만(선 없음), 전개도 좌표 1:1. 외곽·구멍은 위치 맞춤용 가는 빨간 선(인쇄 안 함)."""
    import matplotlib
    matplotlib.use('Agg')
    import matplotlib.pyplot as plt
    from matplotlib.patches import PathPatch, Circle as MCircle, Ellipse as MEllipse, FancyBboxPatch, Rectangle as MRect
    from matplotlib.path import Path as MPath
    M = 10  # 여백 mm
    fig = plt.figure(figsize=((W + 2 * M) / 25.4, (FLAT_L + 2 * M) / 25.4))
    ax = fig.add_axes([0, 0, 1, 1])
    ax.set_xlim(-M, W + M); ax.set_ylim(-M, FLAT_L + M); ax.axis('off')
    ref = dict(fill=False, lw=0.25, ec='#ff0000')
    ax.add_patch(MRect((0, 0), W, FLAT_L, **ref))
    for cut in CUTS:
        cx, cy = to_flat(cut[1], cut[2])
        if cut[0] == 'circle':
            ax.add_patch(MCircle((cx, cy), cut[3], **ref))
        elif cut[0] == 'ellipse':
            ax.add_patch(MEllipse((cx, cy), 2 * cut[3], 2 * cut[4], **ref))
        else:
            w, h, rr = cut[3], cut[4], cut[5]
            ax.add_patch(FancyBboxPatch((cx - w / 2 + rr, cy - h / 2 + rr), w - 2 * rr, h - 2 * rr,
                                        boxstyle=f'round,pad={rr}' if rr > 0 else 'square,pad=0', **ref))
    for u in WING_HOLES_U:
        ax.add_patch(MCircle(wing_flat(u), WING_HOLE_D / 2, **ref))
    verts, codes = [], []
    for loop in MARKS:
        pts = [to_flat(u, v) for u, v in loop]
        verts += pts + [pts[0]]
        codes += [MPath.MOVETO] + [MPath.LINETO] * (len(pts) - 1) + [MPath.CLOSEPOLY]
    ax.add_patch(PathPatch(MPath(verts, codes), fc='#000000', ec='none', lw=0))
    fig.savefig(OUT / f'cover_slope_mark_{TAG}.pdf')
    print(f'MARK: cover_slope_mark_{TAG}.pdf (1:1, {W + 2 * M:g} x {FLAT_L + 2 * M:.1f} mm)')


# ── 실크 인쇄 위치도 DXF (업체가 CAD로 받아야 한다고 해서) ──
def build_silk_dxf():
    """경사면 완성 형상(360 x 260, 바깥 면에서 본 모습) 좌표. 원점 = 왼쪽 위 꼭짓점, y 위로+ (아래로 갈수록 −).
    인쇄 = SILK_PRINT 해치(검정), 묶음 외곽 = SILK_BOX, 위치 치수 = SILK_DIM. 글자는 CAD 글꼴 문제 없게 영문."""
    doc = ezdxf.new('R2010', setup=True)
    doc.units = ezdxf.units.MM
    for name, col, lt in [('OUTLINE', 7, 'CONTINUOUS'), ('CUT_REF', 8, 'CONTINUOUS'), ('BEND', 1, 'DASHED'),
                          ('SILK_PRINT', 7, 'CONTINUOUS'), ('SILK_BOX', 6, 'DASHED'), ('SILK_DIM', 3, 'CONTINUOUS'),
                          ('NOTE', 3, 'CONTINUOUS')]:
        doc.layers.add(name, color=col, linetype=lt)
    msp = doc.modelspace()
    P = lambda u, v: (u, -v)
    msp.add_lwpolyline([P(0, 0), P(W, 0), P(W, SLOPE), P(0, SLOPE)], close=True, dxfattribs={'layer': 'OUTLINE'})
    for vv in (SB, SLOPE - SB):
        msp.add_line(P(0, vv), P(W, vv), dxfattribs={'layer': 'BEND'})
    for cut in CUTS:
        cx, cy = P(cut[1], cut[2])
        if cut[0] == 'circle':
            msp.add_circle((cx, cy), cut[3], dxfattribs={'layer': 'CUT_REF'})
        elif cut[0] == 'ellipse':
            rx, ry = cut[3], cut[4]
            major, ratio = ((rx, 0, 0), ry / rx) if rx >= ry else ((0, ry, 0), rx / ry)
            msp.add_ellipse((cx, cy), major_axis=major, ratio=ratio, dxfattribs={'layer': 'CUT_REF'})
        else:
            w, h = cut[3], cut[4]
            msp.add_lwpolyline([(cx - w / 2, cy - h / 2), (cx + w / 2, cy - h / 2), (cx + w / 2, cy + h / 2),
                                (cx - w / 2, cy + h / 2)], close=True, dxfattribs={'layer': 'CUT_REF'})
    hatch = msp.add_hatch(color=7, dxfattribs={'layer': 'SILK_PRINT'})
    hatch.set_pattern_fill('SOLID')
    hatch.dxf.hatch_style = 0  # 짝홀 — 글자 속 구멍
    for loop in MARKS:
        hatch.paths.add_polyline_path([P(u, v) for u, v in loop], is_closed=True)
    dim = dict(dimstyle='EZDXF', override={'dimlfac': 1, 'dimtxt': 2.5, 'dimasz': 2, 'dimexe': 1, 'dimexo': 1, 'dimdec': 1},
               dxfattribs={'layer': 'SILK_DIM'})
    for i, (u0, v0, u1, v1) in enumerate(SILK_GROUPS, 1):
        msp.add_lwpolyline([P(u0, v0), P(u1, v0), P(u1, v1), P(u0, v1)], close=True, dxfattribs={'layer': 'SILK_BOX'})
        msp.add_text(f'S{i}', height=3, dxfattribs={'layer': 'SILK_BOX'}).set_placement((u0, -v0 + 1.5))
        # 왼쪽 끝 → 묶음 왼쪽, 위 꼭짓점 → 묶음 위 (치수선은 묶음 바로 위·왼쪽에)
        msp.add_linear_dim(base=(0, -v0 + 4), p1=(0, -v0), p2=(u0, -v0), angle=0, **dim).render()
        msp.add_linear_dim(base=(u0 - 4 - 6 * (i // 2 % 2), 0), p1=(u0, 0), p2=(u0, -v0), angle=90, **dim).render()
    notes = ['SILK PRINT: 1 COLOR, BLACK, OUTER FACE (VIEWER SIDE)',
             f'VIEW: SLOPE FACE {W:g} x {SLOPE:.1f} AS FINISHED, SEEN FROM OUTSIDE',
             'ORIGIN (0,0) = LEFT EDGE / UPPER BEND VERTEX (INNER MOLD LINE)',
             'SILK_PRINT = INK AREA (SOLID HATCH)   SILK_BOX = GROUP EXTENT   SILK_DIM = POSITION',
             'CUT_REF = HOLES (REFERENCE)   BEND = BEND START (FLAT AREA BETWEEN)']
    for k, (u0, v0, u1, v1) in enumerate(SILK_GROUPS, 1):
        notes.append(f'S{k}: X {u0:.1f}  Y {v0:.1f}  SIZE {u1 - u0:.1f} x {v1 - v0:.1f}')
    for k, t in enumerate(notes):
        msp.add_text(t, height=3, dxfattribs={'layer': 'NOTE'}).set_placement((0, -SLOPE - 15 - k * 6))
    doc.saveas(OUT / f'cover_slope_silk_{TAG}.dxf')
    print(f'SILK DXF: cover_slope_silk_{TAG}.dxf (경사면 좌표, 치수 {2 * len(SILK_GROUPS)}개)')


# ── 실크 인쇄 위치도 PDF ──
def build_silk_pdf():
    """경사면(완성품, 바깥 면에서 본 모습)에 인쇄 묶음 위치를 치수로. 기준 = 왼쪽 끝 / 위 꼭짓점(안쪽 면 연장선).
    전개도가 아니라 완성 형상 좌표라 업체가 재전개해도 값이 그대로다."""
    import matplotlib
    matplotlib.use('Agg')
    import matplotlib.pyplot as plt
    from matplotlib import font_manager
    from matplotlib.patches import Circle as MCircle, Ellipse as MEllipse, FancyBboxPatch, PathPatch, Rectangle as MRect
    from matplotlib.path import Path as MPath
    for f in [Path.home() / 'Library/Fonts/MonoplexKR-Regular.ttf', Path('C:/Windows/Fonts/malgun.ttf')]:
        if f.exists():
            font_manager.fontManager.addfont(str(f))
            plt.rcParams['font.family'] = font_manager.FontProperties(fname=str(f)).get_name()
    plt.rcParams['axes.unicode_minus'] = False

    fig = plt.figure(figsize=(16.54, 11.69))  # A3 가로
    fig.text(0.03, 0.955, f'경사면 덮개 — 실크 인쇄 위치도 (AL5052 {T:g}t)', fontsize=18)
    fig.text(0.03, 0.93, f'경사면 {W:g} x {SLOPE:.1f}, 바깥 면(관람객 쪽)에서 본 모습. '
             f'X = 왼쪽 끝에서, Y = 위 꼭짓점(위 날개 쪽 절곡, 안쪽 면 연장선)에서 아래로. 단위 mm',
             fontsize=10, color='#444')
    ax = fig.add_axes([0.03, 0.05, 0.62, 0.84])
    flip = lambda u, v: (u, SLOPE - v)  # v 아래로 → 그림 y 위로
    ax.add_patch(MRect((0, 0), W, SLOPE, fill=False, lw=1))
    for vv in (SB, SLOPE - SB):  # 절곡 시작선 — 여기 넘어가면 평면이 아니다
        ax.plot([0, W], [SLOPE - vv] * 2, color='#d33', ls=(0, (6, 3)), lw=0.6)
    ax.text(W + 3, SLOPE - SB, f'위 절곡 시작 (Y {SB:.1f})', va='center', fontsize=7, color='#d33')
    ax.text(W + 3, SB, f'아래 절곡 시작 (Y {SLOPE - SB:.1f})', va='center', fontsize=7, color='#d33')
    ref = dict(fill=False, lw=0.5, ec='#aaa')
    for cut in CUTS:
        cx, cy = flip(cut[1], cut[2])
        if cut[0] == 'circle':
            ax.add_patch(MCircle((cx, cy), cut[3], **ref))
        elif cut[0] == 'ellipse':
            ax.add_patch(MEllipse((cx, cy), 2 * cut[3], 2 * cut[4], **ref))
        else:
            w, h, rr = cut[3], cut[4], cut[5]
            ax.add_patch(FancyBboxPatch((cx - w / 2 + rr, cy - h / 2 + rr), w - 2 * rr, h - 2 * rr,
                                        boxstyle=f'round,pad={rr}' if rr > 0 else 'square,pad=0', **ref))
    verts, codes = [], []
    for loop in MARKS:
        pts = [flip(u, v) for u, v in loop]
        verts += pts + [pts[0]]
        codes += [MPath.MOVETO] + [MPath.LINETO] * (len(pts) - 1) + [MPath.CLOSEPOLY]
    ax.add_patch(PathPatch(MPath(verts, codes), color='#000', lw=0))  # 실제 잉크 색
    rows = []
    for i, (u0, v0, u1, v1) in enumerate(SILK_GROUPS, 1):
        x0, y1 = flip(u0, v0)
        ax.add_patch(MRect((x0 - 1, y1 - (v1 - v0) - 1), u1 - u0 + 2, v1 - v0 + 2, fill=False, lw=0.5,
                           ec='#c0c', ls=(0, (3, 2))))
        ax.text(x0 - 1, y1 + 2, f'S{i}', fontsize=9, color='#c0c', va='bottom')
        # 기준선에서 묶음 왼쪽 위 모서리까지
        ax.plot([0, x0], [y1, y1], color='#c0c', lw=0.3, ls=':')
        ax.plot([x0, x0], [SLOPE, y1], color='#c0c', lw=0.3, ls=':')
        rows.append(f'S{i}   X {u0:6.1f}   Y {v0:6.1f}   {u1 - u0:5.1f} x {v1 - v0:5.1f}')
    ax.annotate('', xy=(0, -10), xytext=(W, -10), arrowprops=dict(arrowstyle='<->', lw=0.6))
    ax.text(W / 2, -16, f'{W:g}', ha='center', fontsize=9)
    ax.annotate('', xy=(-12, 0), xytext=(-12, SLOPE), arrowprops=dict(arrowstyle='<->', lw=0.6))
    ax.text(-15, SLOPE / 2, f'{SLOPE:.1f}', ha='right', va='center', fontsize=9)
    ax.plot([0], [SLOPE], 'o', ms=5, color='#c0c')
    ax.text(-3, SLOPE + 4, '기준 (X0, Y0)', ha='right', fontsize=8, color='#c0c')
    ax.set_aspect('equal'); ax.set_xlim(-40, W + 60); ax.set_ylim(-25, SLOPE + 12); ax.axis('off')

    notes = [
        '인쇄 묶음 (점선 상자 = 묶음 외곽)',
        '      왼쪽 위 모서리         크기',
        *rows,
        '',
        '인쇄: 실크 1도, 잉크 검정, 바깥 면(관람객 쪽)',
        '순서: 블라스트·아노다이징 → 인쇄',
        '  (절곡 전 평판 인쇄 / 절곡 후 인쇄는 귀사 판단.',
        f'   인쇄는 모두 경사면 평면부 안 — 아래 절곡 시작까지',
        f'   {SLOPE - SB - max(b[3] for b in SILK_GROUPS):.1f} 여유)',
        '필름 원본: cover_slope_mark_{TAG}.pdf'.format(TAG=TAG),
        '  (전개도 좌표 1:1, 검정 = 인쇄, 빨간 선 = 위치 참고)',
        f'DXF: cover_slope_flat_{TAG}.dxf — MARK(인쇄)·SILK(묶음) 레이어',
        '회색 = 절단 구멍(참고), 빨강 점선 = 절곡 시작',
    ]
    fig.text(0.68, 0.86, '\n'.join(notes), fontsize=9.5, va='top', linespacing=1.7)
    fig.savefig(OUT / f'cover_slope_silk_{TAG}.pdf')
    fig.savefig(OUT / f'cover_slope_silk_{TAG}.png', dpi=110)
    print(f'SILK: cover_slope_silk_{TAG}.pdf — 묶음 {len(SILK_GROUPS)}개')
    for r in rows:
        print('  ' + r)


# ── 견적 도면 PDF ──
def build_pdf(y_top, y_low):
    import matplotlib
    matplotlib.use('Agg')
    import matplotlib.pyplot as plt
    from matplotlib import font_manager
    from matplotlib.patches import Circle as MCircle, Ellipse as MEllipse, FancyBboxPatch, Polygon, Rectangle as MRect, Arc
    for f in [Path.home() / 'Library/Fonts/MonoplexKR-Regular.ttf', Path('C:/Windows/Fonts/malgun.ttf')]:
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
    ftop = np.array(top) - np.array([DX, GAP])  # 프레임 위 꼭짓점
    hinge2 = ftop + np.array([15 * math.tan(th / 2), -15])
    for h in (hinge1, hinge2):
        ax.add_patch(MCircle(h, 15, fill=False, ec='#bbb', lw=0.8))
    ax.add_patch(MRect(tuple(ftop), WING_FRAME + 10, GAP, color='#bde', lw=0))  # 아크릴 (참고)
    ax.text(ftop[0] + WING_FRAME + 12, ftop[1], f'아크릴 {GAP:g}t', fontsize=7, color='#68a', va='bottom')
    for x in (WING_HOLE_FRAME - WING_HOLE_D / 2, WING_HOLE_FRAME + WING_HOLE_D / 2):
        ax.plot([ftop[0] + x] * 2, [ftop[1] - 6, top[1] + T + 2], color='#888', lw=0.4, ls=':')
    ax.text(ftop[0] + WING_HOLE_FRAME, ftop[1] - 8, f'M6\n(프레임 앞에서 {WING_HOLE_FRAME:g})', ha='center', va='top',
            fontsize=6, color='#888')
    ax.text(hinge1[0] + 17, hinge1[1] + 2, '브라켓 R15\n(축 = 프로파일 중심)', fontsize=7, color='#888')
    ax.annotate('', xy=(-12, 0), xytext=(-12, -LOW), arrowprops=dict(arrowstyle='<->', lw=0.6))
    ax.text(-14, -LOW / 2, f'{LOW:g}', ha='right', va='center', fontsize=9)
    mid = np.array(top) / 2 + np.array([-s, s]) * 14
    ax.text(*mid, f'{SLOPE:.1f}', ha='center', va='center', rotation=45, fontsize=9)
    ax.annotate('', xy=(top[0], top[1] + 12), xytext=(top[0] + WING, top[1] + 12), arrowprops=dict(arrowstyle='<->', lw=0.6))
    ax.text(top[0] + WING / 2, top[1] + 14, f'{WING:g}', ha='center', fontsize=9)
    ax.text(34, -LOW + 2, '아래 날개\n(정면 기둥 위\n브라켓 덮음)', fontsize=7)
    ax.text(top[0] + 2, top[1] + 4, '위 날개 (아크릴 위)', fontsize=7)
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
    for u in WING_HOLES_U:
        ax.add_patch(MCircle(wing_flat(u), WING_HOLE_D / 2, fill=False, lw=0.6))
    hy = wing_flat(0)[1]
    ax.text(WING_HOLES_U[0] + 6, hy, f'{len(WING_HOLES_U)}-Ø{WING_HOLE_D:g} (M6) — 날개 끝에서 {WING - WING_HOLE_IN:g}, '
            f'양 끝에서 {WING_HOLES_U[0]:g}', va='center', fontsize=7)
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
    ax.text((W / 2 + WING_HOLES_U[-1]) / 2, (FLAT_L + y_top) / 2, '위 날개 (아크릴 위)', ha='center', va='center', fontsize=8, color='#999')
    ax.text(W / 2, y_low / 2, '아래 날개', ha='center', va='center', fontsize=8, color='#999')
    ax.annotate('', xy=(0, -10), xytext=(W, -10), arrowprops=dict(arrowstyle='<->', lw=0.6))
    ax.text(W / 2, -16, f'{W:g}', ha='center', fontsize=9)
    ax.annotate('', xy=(-30, 0), xytext=(-30, FLAT_L), arrowprops=dict(arrowstyle='<->', lw=0.6))
    ax.text(-33, FLAT_L / 2, f'{FLAT_L:.1f}\n(참고, 전개)', ha='right', va='center', fontsize=9)
    ax.set_aspect('equal'); ax.set_xlim(-75, W + 60); ax.set_ylim(-25, FLAT_L + 8); ax.axis('off')
    ax.set_title('전개도 (바깥 면에서 본 모습) — 검정 = 절단, 파랑 = 마킹, 빨강 점선 = 절곡', fontsize=11, loc='left')

    notes = [
        f'재질: AL5052  t{T:g}',
        '수량: 1EA',
        f'가공: 레이저 절단 → R 절곡 2곳 (45°, 같은 방향, 안쪽 R{R:g})',
        f'  아래: 브라켓 R15와 동심으로 감쌈. 위: 아크릴 {GAP:g}t 위를 덮어 브라켓과 {GAP:g} 뜸.',
        f'위 날개 구멍 {len(WING_HOLES_U)}-Ø{WING_HOLE_D:g}: 아크릴·프레임과 M6 공용 체결',
        '표면: 비드(샌드)블라스트 → 무색 아노다이징, 무광',
        # f'마킹: 파란 영역 — UV 인쇄. 인쇄 원본 = cover_slope_mark_{TAG}.pdf (1:1, 검정 채움, 빨간 선은 위치 참고)',
        f'마킹: 파란 영역 — 실크 인쇄 1도, 잉크 검정. 위치 = cover_slope_silk_{TAG}.pdf, 필름 원본 = cover_slope_mark_{TAG}.pdf (1:1)',
        f'전개 길이는 참고값(K={K}). 3D(STEP) 형상 기준으로 귀사 장비 값으로 재전개 바랍니다',
    ]
    fig.text(0.03, 0.26, '\n'.join(notes), fontsize=9.5, va='top', linespacing=1.7)
    fig.text(0.03, 0.06, f'첨부: cover_slope_{TAG}.step (3D) / cover_slope_flat_{TAG}.dxf (전개도: CUT·BEND·MARK·SILK 레이어)',
             fontsize=9, color='#444')
    fig.savefig(OUT / f'cover_slope_drawing_{TAG}.pdf')
    fig.savefig(OUT / f'cover_slope_drawing_{TAG}.png', dpi=110)
    print(f'PDF: cover_slope_drawing_{TAG}.pdf')


if __name__ == '__main__':
    print(f'SB={SB:.3f} BA={BA:.3f} 전개 길이={FLAT_L:.3f}')
    check_cuts()
    build_step()
    yt, yl = build_dxf()
    build_pdf(yt, yl)
    build_mark_pdf()
    build_silk_pdf()
    build_silk_dxf()
