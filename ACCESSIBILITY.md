# Accessibility Audit (DietPLAN)

Documento vivo do status de acessibilidade do app. Atualize junto com o ROADMAP.

## WCAG AA — Contraste de cor

### Tokens de texto vs fundo

O audit é feito contra os tokens de cor da paleta v2.1.0+ e atualizado conforme mudanças. Valores calculados via fórmula WCAG (`(L1+0.05)/(L2+0.05)`).

**Critério:** AA normal text ≥ 4.5:1 · AA large text (≥18pt ou ≥14pt bold) ≥ 3.0:1.

#### ✅ Light mode — passa AA normal text

| Par | Ratio | Uso |
|---|---|---|
| `ink-strong / surface` | 14.41 | Body principal sobre cards |
| `ink-strong / cream` | 13.76 | Body sobre fundo de página |
| `ink-medium / surface` | 5.65 | Texto secundário |
| `ink-medium / cream` | 5.39 | Texto secundário fundo página |
| `green-primary / surface` | 5.27 | Accent verde principal |
| `green-primary / green-soft` | 4.63 | Texto verde em cards verdes |
| `green-primary / cream` | 5.03 | Accent sobre bg página |
| `purple-soft / surface` | 4.66 | Accent roxo principal |
| **`accent-warm-text / surface`** | **5.31** | Accent warm (v2.1.51) |
| **`accent-warm-text / accent-warm-soft`** | **4.83** | Accent warm em card warm |
| **`ink-soft-text / surface`** | **5.08** | Hint/terciário (v2.1.51) |
| **`ink-soft-text / cream`** | **4.86** | Hint sobre bg página |

#### ⚠ Light mode — AA-large only (3.0 ≤ ratio < 4.5)

Usados apenas em headings, labels uppercase e badges (≥18pt ou ≥14pt bold).

| Par | Ratio | Uso permitido |
|---|---|---|
| `purple-soft / purple-bg` | 4.03 | Headings/labels em cards roxos |
| `yellow-soft / surface` | 3.57 | Headings/labels amarelos (snacks) |
| `yellow-soft / yellow-bg` | 3.28 | Headings em cards amarelos |
| `accent-danger / surface` | 3.94 | Labels de erro (próximo a 4.5) |
| `accent-danger / accent-danger-soft` | 3.42 | Labels em alert banners |

#### ✅ Dark mode

Light-themed accents sobre fundos escuros passam AA com folga (6–16:1 para body text em surface/cream). Os *-soft backgrounds em dark são rgba overlays que resultam em `~rgba(30,55,45)` composto, contrastando >5:1 com os accents claros override.

## Implementação

### Tokens `-text` (v2.1.51)

Para os pares `accent-warm` e `ink-soft` que falhavam AA como texto, foram adicionados 2 tokens específicos em `styles.css`:

```css
/* LIGHT */
--accent-warm-text: #9C5C16;  /* vs white: 5.31 */
--ink-soft-text:    #667169;  /* vs white: 5.08 */

/* DARK */
--accent-warm-text: #F0B873;  /* mesmo que --accent-warm (já passa) */
--ink-soft-text:    #8E998F;  /* vs dark surface: 5.13 */
```

**Regra de uso:** os tokens `-text` são usados apenas para `color:` de texto body. Os tokens originais (`--accent-warm`, `--ink-soft`) continuam sendo usados para:
- `background:` (fills de cards, badges, buttons)
- `border-color:` (linhas, separadores)
- `fill:` (ícones SVG)
- Qualquer uso decorativo onde contraste não importa

Isso preserva a identidade visual do app (laranjas vivos, cinzas suaves em bordas) enquanto garante legibilidade de texto.

### Outras medidas

- **Focus indicators** (v2.1.50): `:focus-visible` com outline 2px verde-primary em todos os elementos focáveis
- **Focus trap em modais** (v2.1.50): Tab cicla dentro do modal topmost
- **Escape fecha modal** (v2.1.50): funciona em history, calc-details, profile-view
- **aria-label** em 17 botões icônicos (v2.1.24): steppers, remove buttons, nav arrows, close X
- **role="alertdialog"** + `aria-modal="true"` em `#confirm-modal`
- **`prefers-reduced-motion`** respeitado na animação slide-up do profile-view modal

## Ainda pendente

- [ ] **role="radiogroup"** já adicionado no theme toggle; validar aria-checked dinâmico
- [ ] Tap target size audit (mínimo 44×44px — WCAG 2.5.5 / iOS HIG)
- [ ] Screen reader walkthrough (VoiceOver iOS ou TalkBack Android)
- [ ] Testar navegação 100% via teclado (Tab cycle completo) no desktop
