"""윗판 알루미늄 STEP (PLATE_T) — 원판 + 커플러 구멍만 (새김·눈금 없음)

치수는 make_plates.py 상수를 그대로 쓴다. 가공 의뢰용.
  ../../.venv/bin/python make_top_step.py   (build123d 필요)

좌표: 윗면 = z 0, 아랫면 = z −PLATE_T. 원점 = 판 중심(= 축). 0번(센서 쪽) = +y.
"""
import math

from build123d import Box, Cylinder, Pos, export_step

from make_plates import COUPLER_HOLE_D, COUPLER_PCD, HERE, PLATE_D, SHAFT_HOLE, SHAFT_HOLE_D

# PLATE_T = 5.0           # 알루미늄 5T — 950g, 관성이 커서 3T로
PLATE_T = 3.0           # 알루미늄 3T
TAG = f'AL_{PLATE_T:g}t'


def build():
    part = Pos(0, 0, -PLATE_T / 2) * Cylinder(PLATE_D / 2, PLATE_T)
    holes = [(COUPLER_PCD / 2 * math.sin(math.radians(d)), COUPLER_PCD / 2 * math.cos(math.radians(d)))
             for d in (0, 90, 180, 270)]
    for x, y in holes:
        part -= Pos(x, y, -PLATE_T / 2) * Cylinder(COUPLER_HOLE_D / 2, PLATE_T * 2)
    if SHAFT_HOLE:      # 지금 높이 설정에선 False — make_plates.py와 같은 판정
        part -= Pos(0, 0, -PLATE_T / 2) * Cylinder(SHAFT_HOLE_D / 2, PLATE_T * 2)
    return part, holes


if __name__ == '__main__':
    part, holes = build()
    out = HERE / f'top_plate_{TAG}.step'
    export_step(part, str(out))
    bb = part.bounding_box()
    print(f'{out.name}: Ø{PLATE_D:g} × {PLATE_T:g}, 커플러 4-Ø{COUPLER_HOLE_D:g} PCD {COUPLER_PCD:g}, '
          f'가운데 구멍 {"Ø%g" % SHAFT_HOLE_D if SHAFT_HOLE else "없음"}')
    print(f'  bbox {bb.size.X:.2f} × {bb.size.Y:.2f} × {bb.size.Z:.2f}, 부피 {part.volume / 1000:.1f} cm³, '
          f'무게 ≈ {part.volume * 2.7e-3:.0f} g (AL 2.7)')
    print('  구멍 중심:', ', '.join(f'({x:.2f}, {y:.2f})' for x, y in holes))
