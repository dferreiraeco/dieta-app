# images/

Pasta pra imagens de pratos usadas no planner de marmitas e jantares.

## Como adicionar uma imagem real

1. Gere/coloque um PNG ou JPG quadrado (recomendado: 320×320px, top-down ou 3/4, fundo branco ou madeira clara, prato com os ingredientes preparados visíveis).
2. Salva aqui como `marmita-frango.png`, `jantar-omelete.png`, etc. (kebab-case, extensão .png ou .jpg).
3. No arquivo `../data.js`, adiciona o campo `image: 'marmita-frango.png'` na entry correspondente do `MARMITA_DEFS` ou `DINNER_DEFS`:

```js
const MARMITA_DEFS = [
  { id: 'A', name: 'Marmita A - Frango',
    image: 'marmita-frango.png',   // ← adiciona aqui
    desc: 'Peito de frango grelhado + arroz branco',
    // ... resto igual
  },
  // ...
];
```

4. Recarrega o app. O helper `renderMealImageHtml()` em `../app.js` vai preferir o PNG sobre o emoji.

## Fallback

Se uma entry não tem `image` (ou a imagem 404), o app mostra um emoji de comida como placeholder (mapeamento em `app.js`: `MARMITA_EMOJIS` / `DINNER_EMOJIS`). Não quebra nada.

## Nomes esperados (sugestão)

| id | marmita                    | arquivo sugerido        |
|----|----------------------------|-------------------------|
| A  | Frango + arroz branco      | marmita-frango.png      |
| B  | Carne moída + mandioca     | marmita-carne-moida.png |
| C  | Tilápia + arroz integral   | marmita-tilapia.png     |
| D  | Lombo suíno + batata doce  | marmita-lombo.png       |
| E  | Sobrecoxa + macarrão       | marmita-sobrecoxa.png   |
| F  | Coxão mole + arroz branco  | marmita-coxao-mole.png  |

| id | jantar                     | arquivo sugerido        |
|----|----------------------------|-------------------------|
| O  | Omelete Reforçada          | jantar-omelete.png      |
| T  | Tapioca de Frango          | jantar-tapioca.png      |
| C  | Carne com Arroz            | jantar-carne.png        |
| A  | Torrada de Atum            | jantar-atum.png         |
| S  | Sanduíche Natural          | jantar-sanduiche.png    |
| W  | Wrap de Frango             | jantar-wrap.png         |

## Cache

Lembra de bumpar `sw.js` (dieta-v2.1.X) e `?v=2XX` em `index.html` depois de adicionar imagens, senão o service worker pode servir cache antigo.
