"""턴테이블 아크릴 판 레이저 도면 생성 — top_plate.svg(윗판) / base_plate.svg(밑판).

실행: python3 make_plates.py   (표준 라이브러리만)
수치는 아래 상수만 고친다. SVG를 손으로 고치지 말 것 — 다시 만들면 덮인다.

색: 빨강 #FF0000 = 자르기 / 파랑 #0000FF = 윗면 새기기 / 초록 #00FF00 = 아랫면 새기기(선택) /
    자홍 #FF00FF 채움 = 아랫면 파기(밑판 앞 변 단차, 깊이 COVER_T). 단위 mm, 1:1.
각도: 0° = 센서 쪽 = 관람객 쪽(경사면 덮개 쪽), 위에서 본 시계 방향.
윗판 SVG는 0°가 위, 밑판 SVG는 0°가 아래(관람객 쪽 = 도면 아래 변).

높이 쌓기 (밑판 윗면 기준):
  M4 너트 2개(띄우기) SUPPORT_L → 레이지수잔 LS_T → 실리콘 받침 FOOT_H → 윗판 아랫면 = H (기본 6.4 + 8.5 + 6 = 20.9)
  바깥 링 고정: 접시머리 M4×25 위에서 → 링 8.5 → 너트 2개 6.4(띄우기) → 밑판 5 → 너트 3.2 (= 23.1)
  축 끝이 윗판 아랫면 밑에서 끝나게(H > 24 − BASE_T) 띄워서 윗판 가운데 축 구멍이 없다
  레이지수잔: 바깥 링 = 아래(서포트 4개에 접시머리 M4), 안쪽 링 = 위(실리콘 받침에 윗판이 얹힘, 나사 없음).
  두 링 높이가 같아서 서포트로 안쪽 링을 밑판에서, 받침으로 윗판을 바깥 링에서 띄운다.
  (2026-10-16 전엔 Ø200/Ø145 아크릴 스페이서 고리 2장(5t) → H 18이었다)
  모터 축은 장착면에서 24 → 밑판 윗면 위로 24 − BASE_T (기본 19)
  커플러(전장 13, 플랜지 3)는 플랜지가 윗판 아랫면에 붙고 허브가 아래로 → 허브 끝 = H − 13 (기본 5, 밑판에 안 닿음)
  축이 허브에 들어가는 깊이 = (24 − BASE_T) − (H − 13) (기본 14, 고정볼트가 끝에서 5라 8 이상 필요)
  축 끝이 윗판 아랫면을 넘는 양 = (24 − BASE_T) − H (기본 1 → 윗판 가운데 Ø5.5 구멍으로 들어감)
"""
import math
from pathlib import Path

HERE = Path(__file__).resolve().parent

# ── 공통 ──
BASE_T = 5.0        # 밑판 두께
# SPACER_T = 5.0      # 스페이서 고리 한 장 두께(2장) — 서포트로 바꿈
LS_OUT, LS_IN = 202.0, 145.0   # 알루미늄 레이지수잔 바깥/안쪽 지름 (실측)
LS_T = 8.5          # 레이지수잔 두께 (두 링 높이 같음, 실측)
LS_PCD = 187.0      # 바깥 링 고정 구멍 4개 PCD (실측, 접시 자리 면이 위)
LS_HOLE_D = 4.5     # 고정 구멍 (M4)
LS_SPLIT_D = 173.5  # 바깥 링 안쪽 지름 (실측. 안쪽 링 바깥은 171.5, 틈 1)
# SUPPORT_L = 10.0   # M4 서포트(암-암) 10 — 받침이 6이라 너무 높아져서(H 24.5, 축 물림 7.5) 너트로 바꿈
# SUPPORT_L = 3.2    # 너트 한 개 — H 17.7, 축 끝이 윗판으로 1.3 들어가 가운데 구멍이 필요했다
SUPPORT_L = 6.4     # 바깥 링 밑 M4 너트 2개 — 안쪽 링이 밑판에서 이만큼 뜬다
SUPPORT_AF = 7.0    # 너트(서포트) 육각 대변
FOOT_H = 6.0        # 안쪽 링 실리콘 받침이 링 윗면보다 튀어나온 양 (받침 두께 6 실측 — 구멍에 박히는 부분 빼고)
TAPE_R = 42.0       # 테이프가 지나가는 반지름 = 센서 자리 (우드락 시제품 실제 위치. 템플릿은 50이었다)
TAPE_BAND = (TAPE_R - 8, TAPE_R + 8)  # 테이프가 덮을 반지름 범위(센서가 보는 띠)
NARROW_MM = 10.0    # 좁은 테이프 폭(호)
WIDE_DEG = 60.0     # 넓은 테이프(0번) 각도 — 70° 넘기지 말 것

# ── 윗판 ──
PLATE_D = 300.0
SHAFT_HOLE_D = 5.5      # 축 끝이 윗판에 들어올 때만 뚫는다(아래 SHAFT_HOLE)
# Ø5 AL 플랜지 커플링(판매처 도면): 플랜지 Ø28 × 3, 허브 Ø15, 전장 13, 4-Ø3 구멍 지름 21 원 위, 고정볼트 2-M4
COUPLER_FLANGE_D = 28.0
COUPLER_PCD = 21.0
# COUPLER_HOLE_D = 3.0    # 플랜지 구멍 Ø3 → M2.5 볼트·너트
COUPLER_HOLE_D = 3.4    # M3 — 집에 있는 플랜지에 M3가 그냥 들어간다(판매처 도면 Ø3은 표기만 그런 듯)

# ── 밑판 (하우징 프레임 위 360 × 300, 3030 프로파일) ──
BASE_W, BASE_H = 360.0, 300.0
FRAME_INSET = 15.0      # 프로파일 중심선 = 바깥에서 15 (3030)
FRAME_HOLE_D = 6.5      # M6
# 경사면 덮개(housing/cover/make_cover.py) 위 날개가 앞 프로파일 위, 밑판 밑에 깔린다.
# 그만큼 밑판 아랫면을 파서 판이 기울지 않게 한다. 앞줄 M6는 날개 구멍과 같이 조인다
COVER_WING = 30.0       # 날개 길이(프레임 앞 모서리에서) = make_cover.py WING
COVER_T = 1.5           # 날개 두께 = make_cover.py T → 단차 깊이
POCKET_CLEAR = 1.0      # 날개 끝 여유
# 17HS3430 (MotionKing 17HS 데이터시트): 몸통 42.3 □, 나사 4-M3 깊이 4.5 이상 31 간격, 보스 Ø22 × 2, 축 Ø5 × 24
MOTOR_BOSS_HOLE_D = 23.0
MOTOR_SCREW_PITCH = 31.0
MOTOR_SCREW_D = 3.4
MOTOR_BODY = 42.3
# TCRT5000 모듈: 센서 머리를 TAPE_R 위에, 보드는 접선 방향(옆으로) 눕힌다(시제품과 같음) —
# 반지름 방향으로 두면 커넥터가 축·커플러나 레이지수잔 안쪽에 걸린다
# 모듈: 판매 사진(41.9 × 10.2 표기)을 픽셀로 잰 추정값 ±0.3 — 실물을 자로 재서 고칠 것
SENSOR_BOARD = (41.9, 10.2)     # 길이, 폭
SENSOR_HEAD_FROM_END = 8.9      # 핀 헤더 반대쪽 짧은 끝 → 센서 머리 가운데
SENSOR_HOLE_PITCH = 11.5        # 고정 구멍 2개(Ø3.5)가 센서 머리 양옆, 보드 가운데 줄에 ±5.75
SENSOR_HOLE_SLACK = 0.75        # 추정 오차 — 구멍을 보드 방향으로 ±이만큼 장공으로
SENSOR_PLUG = 16.0              # 보드 끝 → 커넥터 끝 (핀 헤더가 ㄱ자로 옆을 향함. 우드락 시제품 사진에서 잰 값)
SENSOR_TILT = 0.0               # 보드를 접선에서 중심 쪽으로 돌린 각. 시제품처럼 접선 그대로(0) —
                                # 커넥터 끝 반지름 ≈65 (TAPE_R 42일 때)
SENSOR_WIRE = (-14.0, 0.0, -15.0, -5.0)  # 배선 구멍 (u0, u1, v0, v1): 커넥터 끝에서 보드 방향 u, 중심 쪽 v(−)
                                         # — 커넥터 옆 중심 쪽. 선을 중심 쪽으로 꺾어 내린다

CUT, TOP, BOT, POCKET = '#FF0000', '#0000FF', '#00FF00', '#FF00FF'


def f(x):
    return f'{x:.3f}'.rstrip('0').rstrip('.')


def polar(c, r, deg, down=False):
    """0° = 위(down=False) 또는 아래(down=True), 위에서 본 시계 방향"""
    a = math.radians(deg)
    if down:
        return (c[0] - r * math.sin(a), c[1] + r * math.cos(a))
    return (c[0] + r * math.sin(a), c[1] - r * math.cos(a))


def circle(c, d, note=''):
    tail = f'  <!-- {note} -->' if note else ''
    return f'    <circle cx="{f(c[0])}" cy="{f(c[1])}" r="{f(d / 2)}"/>{tail}'


def line(a, b, note=''):
    tail = f'  <!-- {note} -->' if note else ''
    return f'    <path d="M{f(a[0])} {f(a[1])} L{f(b[0])} {f(b[1])}"/>{tail}'


def rect(x, y, w, h, rx=0.0, note=''):
    tail = f'  <!-- {note} -->' if note else ''
    r = f' rx="{f(rx)}"' if rx else ''
    return f'    <rect x="{f(x)}" y="{f(y)}" width="{f(w)}" height="{f(h)}"{r}/>{tail}'


def slot(a, b, w, note=''):
    """a→b 수평 장공(폭 w)"""
    r = w / 2
    tail = f'  <!-- {note} -->' if note else ''
    return (f'    <path d="M{f(a[0])} {f(a[1] - r)} L{f(b[0])} {f(b[1] - r)} A{f(r)} {f(r)} 0 0 1 {f(b[0])} {f(b[1] + r)} '
            f'L{f(a[0])} {f(a[1] + r)} A{f(r)} {f(r)} 0 0 1 {f(a[0])} {f(a[1] - r)} Z"/>{tail}')


def group(gid, color, items):
    return [f'  <g id="{gid}" stroke="{color}">', *items, '  </g>']


def svg(w, h, comment, body):
    return '\n'.join([
        f'<svg xmlns="http://www.w3.org/2000/svg" width="{f(w)}mm" height="{f(h)}mm" viewBox="0 0 {f(w)} {f(h)}" '
        f'fill="none" stroke-width="0.1">',
        f'  <!-- {comment}\n       make_plates.py로 생성 — 손으로 고치지 말 것 -->',
        *body, '</svg>', ''])


# 축 끝이 윗판 아랫면 가까이(0.5 이내) 오거나 넘으면 윗판에 축 구멍을 낸다
SHAFT_HOLE = (24 - BASE_T) > (SUPPORT_L + LS_T + FOOT_H) - 0.5


def top_plate():
    m = 10.0
    W = PLATE_D + 2 * m
    c = (W / 2, W / 2)
    cut = [circle(c, PLATE_D, f'윗판 Ø{f(PLATE_D)}'),
           ]
    if SHAFT_HOLE:
        cut.append(circle(c, SHAFT_HOLE_D, '축 — 축 끝이 윗판으로 들어온다'))
    for d in (0, 90, 180, 270):
        cut.append(circle(polar(c, COUPLER_PCD / 2, d), COUPLER_HOLE_D, f'커플러 4-Ø{f(COUPLER_HOLE_D)} (M3)'))
    r = PLATE_D / 2
    top = [line(polar(c, r - 14, d), polar(c, r - 4, d), f'사물 자리 {d}°') for d in (0, 90, 180, 270)]
    t = [polar(c, r - 20, 0), polar(c, r - 26, -2.6), polar(c, r - 26, 2.6)]
    top.append(f'    <path d="M{f(t[0][0])} {f(t[0][1])} L{f(t[1][0])} {f(t[1][1])} L{f(t[2][0])} {f(t[2][1])} Z"/>'
               '  <!-- 0번 = mycelium = 넓은 테이프, 센서 쪽 -->')
    top.append(circle(c, COUPLER_FLANGE_D, '커플러 플랜지 자리(아랫면에 붙음)'))
    # 아랫면: 레이지수잔 원 + 테이프 가장자리 눈금(센서 띠 TAPE_BAND 밖, 새김선을 센서가 테이프로 읽지 않게)
    bot = [circle(c, LS_OUT, '레이지수잔 바깥'), circle(c, LS_IN, '레이지수잔 안쪽')]
    narrow = math.degrees(NARROW_MM / TAPE_R)
    r0, r1 = TAPE_BAND[1] + 3, TAPE_BAND[1] + 9
    ticks = [(-WIDE_DEG / 2, '넓은 테이프 시작'), (0, '넓은 테이프 가운데'), (WIDE_DEG / 2, '넓은 테이프 끝')]
    for d in (90, 180, 270):
        ticks += [(d - narrow / 2, f'좁은 테이프 {d}° 시작'), (d + narrow / 2, f'좁은 테이프 {d}° 끝')]
    bot += [line(polar(c, r0, d), polar(c, r1, d), n) for d, n in ticks]
    body = group('cut', CUT, cut) + group('engrave-top', TOP, top) + group('engrave-bottom', BOT, bot)
    note = (f'턴테이블 윗판 Ø{f(PLATE_D)} — 레이저 1:1. 0° = 위 = 센서 쪽. 아랫면 표시(초록)는 세로축 대칭이라 '
            f'좌우로 뒤집어 새기면 된다. 아크릴은 흰색 불투명(투명이면 센서가 못 읽음)')
    return svg(W, W, note, body)


def base_plate():
    m = 10.0
    gap = 10.0
    W = m + BASE_W + m
    H = m + BASE_H + m
    ox, oy = m, m
    c = (ox + BASE_W / 2, oy + BASE_H / 2)
    cut = [rect(ox, oy, BASE_W, BASE_H, 2, f'밑판 {f(BASE_W)} × {f(BASE_H)}')]
    for x in (FRAME_INSET, BASE_W / 2, BASE_W - FRAME_INSET):
        for y in (FRAME_INSET, BASE_H - FRAME_INSET):
            cut.append(circle((ox + x, oy + y), FRAME_HOLE_D, '프레임 고정 M6 — 프로파일 위치 확인 후'))
    cut.append(circle(c, MOTOR_BOSS_HOLE_D, '모터 보스 Ø22 + 축'))
    p = MOTOR_SCREW_PITCH / 2
    for sx in (-1, 1):
        for sy in (-1, 1):
            cut.append(circle((c[0] + sx * p, c[1] + sy * p), MOTOR_SCREW_D, '모터 M3 (31 간격)'))
    # 센서: 0° = 도면 아래(관람객 쪽). 머리 = (cx, cy + TAPE_R). 보드는 +x 쪽(핀 헤더 쪽)으로 눕혀
    # SENSOR_TILT만큼 중심 쪽으로 돌린다 — 보드 좌표(u = 보드 방향, 머리 = 0)로 그리고 transform으로 돌림
    hx, hy = c[0], c[1] + TAPE_R
    rot = f'rotate({f(-SENSOR_TILT)} {f(hx)} {f(hy)})'
    bl, bw = SENSOR_BOARD
    u_end = bl - SENSOR_HEAD_FROM_END       # 머리 → 핀 헤더 쪽 보드 끝
    u_plug = u_end + SENSOR_PLUG            # 머리 → 커넥터 끝
    hp, sl = SENSOR_HOLE_PITCH / 2, SENSOR_HOLE_SLACK
    sens_cut = [slot((hx + u - sl, hy), (hx + u + sl, hy), 3.4, '센서 모듈 고정 M3 (추정 위치 ±0.75 장공)')
                for u in (-hp, hp)]
    wu0, wu1, wv0, wv1 = SENSOR_WIRE  # v는 중심 쪽이 −, 도면에서 머리는 중심 아래라 중심 쪽 = −y
    sens_cut.append(rect(hx + u_plug + wu0, hy + wv0, wu1 - wu0, wv1 - wv0, 2,
                         '센서 배선 구멍(커넥터 옆 중심 쪽, 선을 꺾어 내림)'))
    cut += [f'    <g transform="{rot}">', *sens_cut, '    </g>']
    a = math.radians(SENSOR_TILT)
    def r_of(u, v):  # 보드 좌표 → 축에서 반지름 (v + = 바깥)
        return math.hypot(u * math.cos(a) + v * math.sin(a), TAPE_R - u * math.sin(a) + v * math.cos(a))
    r_plug = max(r_of(u_plug, v) for v in (-1.5, 1.5))
    r_wire = max(r_of(u_plug + u, v) for u in (wu0, wu1) for v in (wv0, wv1))
    assert max(r_plug, r_wire) < LS_IN / 2 - 0.5, \
        f'센서 커넥터(반지름 {r_plug:.1f})·배선 구멍({r_wire:.1f})이 레이지수잔 안쪽에 닿는다 — SENSOR_TILT를 키울 것'
    print(f'센서: 커넥터 끝 반지름 {r_plug:.1f}, 배선 구멍 끝 {r_wire:.1f} (레이지수잔 안쪽 {LS_IN / 2:g})')
    # # 스페이서 고리 2장 — M4 서포트로 바꿈(2026-10-16)
    # rc = ox + BASE_W + gap + LS_OUT / 2
    # for i, ry in enumerate((oy + LS_OUT / 2, oy + LS_OUT * 1.5 + gap)):
    #     cut.append(circle((rc, ry), LS_OUT, f'스페이서 고리 {i + 1} 바깥 (t{f(SPACER_T)})'))
    #     cut.append(circle((rc, ry), LS_IN, f'스페이서 고리 {i + 1} 안쪽'))
    # 레이지수잔 바깥 링 고정: 서포트 4개, 45° 자리(센서·모터·단차와 안 겹침)
    sup = [polar(c, LS_PCD / 2, d, down=True) for d in (45, 135, 225, 315)]
    cut += [circle(p_, LS_HOLE_D, '레이지수잔 바깥 링 M4 — 접시머리 M4×25 + 띄우기 너트 2 + 밑 너트') for p_ in sup]
    sr = SUPPORT_AF / math.sqrt(3)  # 육각 꼭짓점 반지름
    assert LS_PCD / 2 - sr > LS_SPLIT_D / 2 + 0.5, '너트가 안쪽 링 밑으로 들어간다'
    assert LS_PCD / 2 + sr < LS_OUT / 2, '너트가 바깥 링 밖으로 나온다'
    top = [circle(c, LS_OUT, '레이지수잔 바깥'), circle(c, LS_SPLIT_D, '두 링 사이(안쪽 링은 밑판에서 뜸)'),
           *[circle(p_, SUPPORT_AF * 2 / math.sqrt(3), '띄우기 너트 자리') for p_ in sup],
           f'    <g transform="{rot}">',
           rect(hx - SENSOR_HEAD_FROM_END, hy - bw / 2, bl, bw, 0, 'TCRT5000 보드 자리'),
           rect(hx + u_end, hy - 2, SENSOR_PLUG, 4, 0, '핀 헤더 + 듀폰 커넥터'),
           line((hx - 3, hy), (hx + 3, hy), f'센서 머리 = 반지름 {f(TAPE_R)}'), line((hx, hy - 3), (hx, hy + 3)),
           '    </g>',
           rect(c[0] - MOTOR_BODY / 2, c[1] - MOTOR_BODY / 2, MOTOR_BODY, MOTOR_BODY, 0, '모터 몸통(밑에 붙음) 참고')]
    t = [(c[0], oy + BASE_H - 22), (c[0] - 4, oy + BASE_H - 30), (c[0] + 4, oy + BASE_H - 30)]
    top.append(f'    <path d="M{f(t[0][0])} {f(t[0][1])} L{f(t[1][0])} {f(t[1][1])} L{f(t[2][0])} {f(t[2][1])} Z"/>'
               '  <!-- 관람객 쪽(경사면) = 0° = 센서 쪽 -->')
    # 아랫면 단차: 앞 변(도면 아래) 전체 폭, 날개가 들어갈 만큼. 좌우 대칭이라 뒤집어 새겨도 같다
    pd = COVER_WING + POCKET_CLEAR
    pocket = [rect(ox, oy + BASE_H - pd, BASE_W, pd, 0,
                   f'아랫면 파기 깊이 {f(COVER_T)} — 덮개 위 날개 자리(남는 두께 {f(BASE_T - COVER_T)})')]
    body = (group('cut', CUT, cut) + group('engrave-top', TOP, top)
            + [f'  <g id="pocket-bottom" fill="{POCKET}" fill-opacity="0.35" stroke="{POCKET}">', *pocket, '  </g>'])
    note = (f'턴테이블 밑판 {f(BASE_W)}×{f(BASE_H)} — 레이저 1:1. 도면 아래 변 = 관람객 쪽 = 0° = 센서. '
            f'모터는 밑판 아래에 붙고(M3 × {f(BASE_T + 4)}), 센서는 위에 M3 스페이서로 띄운다. '
            f'자홍 = 아랫면 {f(COVER_T)} 파기(경사면 덮개 위 날개 자리) — 앞줄 M6는 날개와 같이 조임')
    return svg(W, H, note, body)


if __name__ == '__main__':
    (HERE / 'top_plate.svg').write_text(top_plate(), encoding='utf-8')
    (HERE / 'base_plate.svg').write_text(base_plate(), encoding='utf-8')
    Hs = SUPPORT_L + LS_T + FOOT_H
    shaft = 24 - BASE_T
    print(f'윗판 아랫면 높이 H = {Hs:g}, 허브 끝 {Hs - 13:g}, 축 물림 {shaft - (Hs - 13):g}, 축 끝 넘침 {shaft - Hs:g}, '
          f'센서 스페이서 ≈ {Hs - 4 - 7 - 1.6:.1f} (센서 윗면 ↔ 윗판 4, TCRT 7 + 기판 1.6 가정)')
    assert Hs - 13 > 0, '허브가 밑판에 닿는다 — 띄우기를 높게'
    assert shaft - (Hs - 13) >= 8, '축이 허브에 덜 들어간다 — 띄우기를 낮게'
    assert shaft - Hs <= 4, '축이 윗판 위로 나온다 — 띄우기를 높게'
    print('윗판 가운데 축 구멍:', '있음' if SHAFT_HOLE else '없음')
    assert COVER_WING + POCKET_CLEAR < BASE_H / 2 - MOTOR_BODY / 2, '단차가 모터 자리까지 온다'
    print(f'밑판 앞 변 단차: 깊이 {COVER_T:g} × {COVER_WING + POCKET_CLEAR:g}, 남는 두께 {BASE_T - COVER_T:g}')
