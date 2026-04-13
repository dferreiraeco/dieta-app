#!/usr/bin/env python3
"""
crop-meals.py — pós-processa PNGs de refeição gerados por IA pra encaixar
no card circular do dieta-app (v2.1.x).

Uso:
    python3 scripts/crop-meals.py                # processa toda a pasta images/
    python3 scripts/crop-meals.py marmita-frango.png   # processa só 1 arquivo

O que faz, pra cada PNG em images/:
  1. Detecta a bounding box do conteúdo opaco (alpha >= 128) OU, se a imagem
     for RGB sem alpha, usa diferença de cor com os cantos como heurística.
  2. Expande pra um quadrado centrado na bbox (preserva proporção circular).
  3. Redimensiona pra 512×512 (boa qualidade pro círculo de 80px em retina 4x).
  4. Converte pra JPG com qualidade 82 (target ~30-80 KB) se a imagem não
     precisa de transparência, ou mantém PNG otimizado se precisa.
  5. Sobrescreve o arquivo original (mantém backup em images/.originals/).

Dependências: Pillow (pip install Pillow)
"""

import sys
import os
import shutil
from pathlib import Path
from PIL import Image, ImageChops, ImageFilter

# Pasta-raiz = parent do diretório do script
SCRIPT_DIR = Path(__file__).resolve().parent
ROOT = SCRIPT_DIR.parent
IMAGES_DIR = ROOT / 'images'
BACKUP_DIR = IMAGES_DIR / '.originals'

TARGET_SIZE = 512          # pixels lado (512 é 6,4× DPR pro círculo de 80px)
ALPHA_THRESHOLD = 220      # alpha >= 220 é "bem opaco"
RGB_DIFF_THRESHOLD = 70    # diff grayscale vs cor de fundo > 70 = "conteúdo"
                            # (alto o bastante pra descartar ruído do fundo)


def _longest_run_above(values, threshold):
    """Encontra o maior run contíguo de valores > threshold. Retorna (start, end)."""
    best_s, best_e = 0, 0
    cur_s = None
    for i, v in enumerate(values):
        if v > threshold:
            if cur_s is None:
                cur_s = i
        else:
            if cur_s is not None:
                if i - cur_s > best_e - best_s:
                    best_s, best_e = cur_s, i
                cur_s = None
    if cur_s is not None:
        if len(values) - cur_s > best_e - best_s:
            best_s, best_e = cur_s, len(values)
    return best_s, best_e


def _bbox_from_mask_projection(mask, min_density=15):
    """Encontra bbox do maior cluster contíguo no eixo X e Y separadamente.
    Usa projeções de linha e coluna (média por linha/coluna após resize), que
    naturalmente separa o bowl principal de watermarks/textos pequenos que
    ficam numa banda distinta.

    min_density: avg value da linha/coluna (0-255) pra considerar "conteúdo"."""
    w, h = mask.size
    # Projeção Y: média por linha → lista de h valores 0-255
    row_avg = list(mask.resize((1, h), Image.BILINEAR).getdata())
    # Projeção X: média por coluna → lista de w valores 0-255
    col_avg = list(mask.resize((w, 1), Image.BILINEAR).getdata())

    y0, y1 = _longest_run_above(row_avg, min_density)
    x0, x1 = _longest_run_above(col_avg, min_density)

    if y0 == y1 or x0 == x1:
        return None
    return (x0, y0, x1, y1)


def find_content_bbox(img):
    """Retorna (x0, y0, x1, y1) da área de conteúdo. Lida com dois casos:
       1) Imagem RGBA com cantos transparentes → usa alpha
       2) Imagem opaca (cantos com alpha=255) → usa RGB diff com os cantos

    Usa projeções de linha/coluna pra pegar o maior cluster contíguo,
    isolando o prato de watermarks/texto que ficam separados do bowl."""
    w, h = img.size

    # Verifica alpha dos 4 cantos
    corners_alpha = [
        img.getpixel((2, 2))[3],
        img.getpixel((w - 3, 2))[3],
        img.getpixel((2, h - 3))[3],
        img.getpixel((w - 3, h - 3))[3],
    ]

    # Caso 1: cantos transparentes → usa canal alpha
    if max(corners_alpha) < 128:
        alpha = img.split()[-1]
        mask = alpha.point(lambda p: 255 if p >= ALPHA_THRESHOLD else 0)

        # Tenta primeiro via projeção (descarta watermark)
        bbox = _bbox_from_mask_projection(mask, min_density=20)
        if bbox:
            return bbox

        # Fallback: bbox simples
        bbox = mask.getbbox()
        if bbox:
            return bbox

        # Último recurso: threshold relaxado
        mask = alpha.point(lambda p: 255 if p >= 128 else 0)
        return mask.getbbox()

    # Caso 2: imagem opaca → detecta conteúdo por diferença de cor com os cantos.
    # Fundo pode ter ruído/gradiente, e algumas imagens têm watermarks/texto
    # que o RGB diff pega por engano.
    rgb = img.convert('RGB')
    sample_pts = [
        (2, 2), (w // 2, 2), (w - 3, 2),
        (2, h // 2),                    (w - 3, h // 2),
        (2, h - 3), (w // 2, h - 3), (w - 3, h - 3),
    ]
    samples = [rgb.getpixel(p) for p in sample_pts]
    avg_bg = tuple(sum(c[i] for c in samples) // len(samples) for i in range(3))

    bg_img = Image.new('RGB', rgb.size, avg_bg)
    diff = ImageChops.difference(rgb, bg_img).convert('L')
    mask_color = diff.point(lambda p: 255 if p > RGB_DIFF_THRESHOLD else 0)

    # Combina com detecção de bordas (FIND_EDGES) pra pegar pratos claros
    # sobre fundo claro (ex: sanduíche em prato branco). O Laplaciano pega
    # a borda do rim do prato mesmo quando o interior não difere do fundo.
    gray = rgb.convert('L')
    edges = gray.filter(ImageFilter.FIND_EDGES)
    mask_edge = edges.point(lambda p: 255 if p > 25 else 0)
    # Dilata as bordas pra transformar outlines finos em bandas sólidas
    mask_edge = mask_edge.filter(ImageFilter.MaxFilter(7))

    # OR das duas máscaras (color + edges)
    mask = ImageChops.lighter(mask_color, mask_edge)

    # Erosão LEVE + dilatação leve: remove ruído pixelado do fundo
    mask_clean = mask.filter(ImageFilter.MinFilter(11))
    mask_clean = mask_clean.filter(ImageFilter.MaxFilter(15))

    # Usa projeção pra pegar o maior cluster contíguo (descarta watermark/texto)
    bbox = _bbox_from_mask_projection(mask_clean, min_density=15)
    if bbox:
        return bbox

    # Fallback: bbox simples
    bbox = mask_clean.getbbox()
    if bbox:
        return bbox

    # Último recurso: threshold relaxado
    mask2 = diff.point(lambda p: 255 if p > 40 else 0)
    mask2 = mask2.filter(ImageFilter.MinFilter(5))
    return mask2.getbbox()


def square_bbox(bbox, canvas_w, canvas_h):
    """Expande bbox pra QUADRADO perfeito centralizado, respeitando limites
    do canvas. Garante que o retorno seja sempre um quadrado, nunca retangular."""
    x0, y0, x1, y1 = bbox
    cx = (x0 + x1) // 2
    cy = (y0 + y1) // 2
    # Lado desejado = maior dimensão do bbox
    desired = max(x1 - x0, y1 - y0)
    # Mas não pode exceder o menor lado do canvas
    max_side = min(canvas_w, canvas_h)
    side = min(desired, max_side)
    half = side // 2
    # Tenta centralizar
    sx0 = cx - half
    sy0 = cy - half
    # Shift se sair do canvas (mantém quadrado, só move o centro)
    if sx0 < 0:
        sx0 = 0
    if sy0 < 0:
        sy0 = 0
    if sx0 + side > canvas_w:
        sx0 = canvas_w - side
    if sy0 + side > canvas_h:
        sy0 = canvas_h - side
    return (sx0, sy0, sx0 + side, sy0 + side)


def process_one(png_path):
    name = png_path.name
    print(f'[{name}]')

    # Backup do original antes de sobrescrever
    BACKUP_DIR.mkdir(parents=True, exist_ok=True)
    backup_path = BACKUP_DIR / name
    if not backup_path.exists():
        shutil.copy2(png_path, backup_path)
        print(f'  backup → {backup_path.relative_to(ROOT)}')

    img = Image.open(png_path)
    w, h = img.size
    print(f'  original: {w}×{h} ({img.mode})')

    # Converte pra RGBA pra facilitar detecção
    if img.mode != 'RGBA':
        img = img.convert('RGBA')

    # v2.1.14: estratégia por tipo de imagem
    # 1) Landscape/portrait (aspect != 1:1): center crop to min(w,h). DALL-E
    #    centraliza o sujeito com margens, então simples e confiável.
    # 2) Square + bg transparente (RGBA com cantos alpha=0): usa bbox
    #    detection que lida bem com watermarks via projeção (ex: carne-moida)
    # 3) Square + bg opaco (fundo gradiente/cinza): center crop to min(w,h)
    #    porque a detecção RGB diff é instável (gradient noise, plate rim
    #    near-white on near-white). DALL-E centraliza o prato de qualquer jeito.
    aspect = w / h
    use_center_crop = False
    reason = ''

    if aspect > 1.2 or aspect < 0.83:
        use_center_crop = True
        reason = 'landscape/portrait'
    else:
        # Verifica cantos pra decidir entre bbox detection e center crop
        corners = [
            img.getpixel((2, 2))[3],
            img.getpixel((w - 3, 2))[3],
            img.getpixel((2, h - 3))[3],
            img.getpixel((w - 3, h - 3))[3],
        ]
        if max(corners) < 128:
            # Bg transparente → bbox detection (handles watermarks)
            bbox = find_content_bbox(img)
            if not bbox:
                print(f'  WARN: nenhum conteúdo detectado, skip')
                return
            sq = square_bbox(bbox, w, h)
            print(f'  bbox crop (transparente): {sq}')
        else:
            # Bg opaco → center crop simples (mais confiável)
            use_center_crop = True
            reason = 'opaco (square)'

    if use_center_crop:
        side = min(w, h)
        cx, cy = w // 2, h // 2
        half = side // 2
        sq = (cx - half, cy - half, cx - half + side, cy - half + side)
        print(f'  center crop {side}×{side} ({reason})')

    cropped = img.crop(sq)
    print(f'  crop: {sq} = {cropped.size[0]}×{cropped.size[1]}')

    # Resize final
    resized = cropped.resize((TARGET_SIZE, TARGET_SIZE), Image.LANCZOS)

    # Se tem alpha útil (transparência dentro do bowl), mantém PNG.
    # Senão, flatten pra RGB e salva como PNG sem alpha (menor).
    alpha_min = min(resized.split()[-1].getextrema())
    has_transparency = alpha_min < 255
    if has_transparency:
        # Mantém RGBA. Otimiza.
        resized.save(png_path, 'PNG', optimize=True)
    else:
        # Sem transparência útil → flatten pra RGB + save otimizado
        rgb = resized.convert('RGB')
        rgb.save(png_path, 'PNG', optimize=True)

    new_size_kb = png_path.stat().st_size // 1024
    print(f'  saved: {TARGET_SIZE}×{TARGET_SIZE} PNG ({new_size_kb} KB)')


def main():
    if not IMAGES_DIR.exists():
        sys.exit(f'ERRO: pasta {IMAGES_DIR} não existe')

    # Se passou argumento, processa só aquele arquivo. Senão processa todos.
    if len(sys.argv) > 1:
        targets = [IMAGES_DIR / arg for arg in sys.argv[1:]]
        missing = [t for t in targets if not t.exists()]
        if missing:
            sys.exit(f'ERRO: não encontrei {[str(m) for m in missing]}')
    else:
        targets = sorted([
            p for p in IMAGES_DIR.glob('*.png')
            if not p.name.startswith('.')
        ])

    if not targets:
        print('Nenhum PNG pra processar em images/')
        return

    print(f'Processando {len(targets)} imagem(ns)...\n')
    for png in targets:
        try:
            process_one(png)
        except Exception as e:
            print(f'  ERRO: {e}')
        print()

    print('Pronto.')
    print(f'Backups dos originais em: {BACKUP_DIR.relative_to(ROOT)}')


if __name__ == '__main__':
    main()
