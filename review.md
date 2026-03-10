# Code Review — Kanban MVP

**Projeto:** `frontend/` — Next.js 16, React 19, Tailwind CSS v4, @dnd-kit, Jest, Playwright
**Data:** 2026-03-10

---

## Sumário executivo

O projeto está bem estruturado para um MVP. A separação de responsabilidades é clara, o estado é gerenciado de forma imutável, a cobertura de testes é sólida e a UX é polida. Os pontos abaixo são observações técnicas objetivas — alguns são bugs reais, outros são débitos de qualidade que merecem atenção antes de o projeto escalar.

---

## 1. Tipos (`src/types/kanban.ts`)

### `details` é obrigatório, mas tratado como opcional em runtime

```ts
export interface Card {
  id: string;
  title: string;
  details: string;   // obrigatório pelo tipo
}
```

Em `Board.tsx` e `Card.tsx` há verificações `card.details && (...)`, o que implica que `details` pode ser falsy. O tipo deveria refletir a realidade:

```ts
details: string;     // OK — string vazia é válida
```

Não é um bug em si, mas a verificação `card.details && ...` com um campo `string` obrigatório é semanticamente imprecisa. Se `details` pode ser vazio intencionalmente (string `""`), as guards estão corretas, mas o tipo poderia ser `details?: string` para comunicar a intenção.

**Grau:** baixo — consistência semântica.

---

## 2. Estado e hook (`src/hooks/useBoard.ts`)

### Funções de ação recriadas a cada render

Todas as cinco funções (`renameColumn`, `addCard`, etc.) são definidas dentro do corpo do hook sem `useCallback`. Isso significa que a cada render do `KanbanApp` novas referências são criadas e passadas para `Board → Column → Card`. Com o volume atual isso não causa problemas perceptíveis, mas pode ser fonte de re-renders desnecessários conforme o board crescer.

```ts
// atual
const renameColumn = (columnId: string, name: string) => { ... };

// melhor
const renameColumn = useCallback((columnId: string, name: string) => { ... }, []);
```

**Grau:** médio — performance/escalabilidade.

---

### `deleteCard` usa mutação antes de retornar

```ts
const deleteCard = (cardId: string) => {
  setState((s) => {
    const cards = { ...s.cards };
    delete cards[cardId];   // mutação do objeto copiado — aceitável
    return { ...s, cards, columns: ... };
  });
};
```

O padrão está tecnicamente correto (copia antes de deletar), mas pode ser reescrito sem mutação para consistência com o restante do código:

```ts
const { [cardId]: _, ...cards } = s.cards;
return { ...s, cards, columns: ... };
```

**Grau:** estilo — consistência.

---

## 3. Lógica de DnD (`src/components/Board.tsx` + `src/lib/dnd-utils.ts`)

### Detecção de colvo-alvo: busca linear O(n×m) no `handleDragEnd`

```ts
// Board.tsx:50
const targetCol = state.columns.find((c) => c.cardIds.includes(overId));
```

`Array.includes` percorre `cardIds` de cada coluna. Para um board com muitas colunas e muitos cards, isso é O(n×m). A alternativa mais eficiente seria manter um `Map<cardId, columnId>` derivado do estado — o que `findColumnOfCard` em `dnd-utils.ts` também faz da mesma forma.

Para o escopo atual (5 colunas, ~15 cards) o impacto é zero, mas vale nota.

**Grau:** baixo — escalabilidade futura.

---

### `handleDragEnd` duplica a lógica de `findColumnOfCard`

`dnd-utils.ts` já exporta `findColumnOfCard`, mas `Board.tsx` reimplementa a mesma busca inline:

```ts
// Board.tsx — duplicado
const targetCol = state.columns.find((c) => c.cardIds.includes(overId));

// dnd-utils.ts — já existe
export function findColumnOfCard(state, cardId) { ... }
```

A função de `dnd-utils.ts` poderia ser usada diretamente no handler.

**Grau:** baixo — duplicação de lógica.

---

### `DragOverlay` com `dropAnimation={null}` suprime animação

```tsx
<DragOverlay dropAnimation={null}>
```

Isso elimina a animação de "snap" ao soltar o card. O visual funciona, mas a ausência de animação pode parecer abrupta. A animação padrão do dnd-kit (ou uma customizada) costuma melhorar a percepção de qualidade.

**Grau:** UX / preferência.

---

## 4. Componente `Column.tsx`

### Estado local `nameValue` pode dessincronizar do estado global

```ts
const [nameValue, setNameValue] = useState(column.name);
```

`useState` recebe o valor inicial apenas uma vez. Se `column.name` for alterado externamente (por outro componente ou futura sincronização), `nameValue` não será atualizado. O correto é sincronizar via `useEffect`:

```ts
useEffect(() => {
  if (!editing) setNameValue(column.name);
}, [column.name, editing]);
```

Para o estado atual (sem persistência nem colaboração) isso não causa bug visível, mas é um padrão propenso a erros.

**Grau:** médio — fragilidade do padrão.

---

### `commitRename` chamado duas vezes no Enter

O input tem `onKeyDown` com `commitRename()` no Enter **e** `onBlur={commitRename}`. Quando o usuário pressiona Enter:
1. `onKeyDown` chama `commitRename()` → `setEditing(false)`
2. O blur disparado pela saída do foco chama `commitRename()` novamente

Na prática `setEditing(false)` já desmonta o input antes do segundo chamado causar dano (o segundo `commitRename` roda com o nome já salvo), mas é uma race condition frágil. A solução é usar uma ref de guard ou remover o `onBlur` quando Enter foi pressionado.

**Grau:** médio — race condition latente.

---

## 5. Componentes de Modal (`AddCardModal.tsx`, `CardModal.tsx`)

### Listener de teclado global em vez de `onKeyDown` no dialog

Ambos os modais registram o handler de Escape diretamente no `document`:

```ts
document.addEventListener('keydown', handler);
```

Isso funciona, mas tem dois problemas:

1. **Múltiplos modais abertos**: se dois modais estivessem abertos simultaneamente, ambos receberiam o evento Escape. O padrão correto para modais é capturar o evento no próprio elemento com `onKeyDown` e `e.stopPropagation()`.

2. **Foco fora do modal**: o handler captura teclas mesmo quando o foco não está no modal. Para acessibilidade, o foco deveria ser preso (*focus trap*) dentro do modal enquanto ele está aberto.

**Grau:** médio — acessibilidade e robustez.

---

### Falta `aria-describedby` e `role="dialog"` sem `aria-labelledby`

```tsx
<div role="dialog" aria-modal="true" aria-label="Edit card">
```

`aria-label` é aceitável, mas a prática recomendada pelo WAI-ARIA é referenciar o título visível com `aria-labelledby`:

```tsx
<h2 id="modal-title">Edit card</h2>
<div role="dialog" aria-modal="true" aria-labelledby="modal-title">
```

**Grau:** baixo — boas práticas de acessibilidade.

---

### Sem *focus trap*

Nenhum dos modais implementa focus trap. Com Tab, o foco pode sair do modal e interagir com o board atrás do backdrop. Isso é um problema de acessibilidade (WCAG 2.1 — 2.4.3 Focus Order).

**Grau:** médio — acessibilidade.

---

## 6. Componente `Card.tsx`

### `role="button"` + dnd-kit listeners = conflito de papéis

```tsx
<div
  role="button"
  tabIndex={0}
  {...attributes}   // inclui role e aria de arrastar do dnd-kit
  {...listeners}
>
```

`{...attributes}` do dnd-kit já injeta `role="button"` e atributos ARIA de drag. Combinar isso com um `role="button"` explícito no elemento pode gerar atributos duplicados. Verifique se o dnd-kit sobrescreve ou conflita.

**Grau:** baixo — inspecionar atributos gerados.

---

### Clique no card durante drag abre o modal

```ts
onClick={() => !isDragging && setModalOpen(true)}
```

A guard `!isDragging` resolve a maioria dos casos, mas em movimentos muito rápidos (pointer up antes do dnd-kit mudar `isDragging`) o modal pode abrir acidentalmente. Uma solução mais robusta é usar `pointerdown`/`pointerup` com timer ou medir a distância percorrida.

**Grau:** baixo — edge case de UX.

---

## 7. `src/data/seed.ts`

### IDs de colunas gerados dinamicamente quebram testes de snapshot/id-based

```ts
{ id: nanoid(), name: 'Backlog', cardIds: ... }
```

Os IDs das colunas são gerados a cada chamada de `createInitialState()`. Testes que dependem de IDs fixos (como `useBoard.test.ts`, que acessa `columns[0].id`) funcionam, mas testes de snapshot ou qualquer lógica que serializa o estado inicial terão IDs não determinísticos.

Para um MVP sem persistência, isso é aceitável. Com persistência futura (localStorage, DB), IDs de colunas fixos seriam necessários.

**Grau:** baixo — nota para evolução futura.

---

## 8. Testes unitários (`__tests__/`)

### Cobertura geral: boa

| Arquivo | Testes | Qualidade |
|---|---|---|
| `useBoard.test.ts` | 11 | Excelente — cobre todos os actions com casos positivos e negativos |
| `dnd-utils.test.ts` | 6 | Bom — cobre same-column, cross-column, coluna vazia, imutabilidade |
| `seed.test.ts` | 5 | Bom — valida estrutura, sem orphans, referências novas |
| `CardModal.test.tsx` | 8 | Excelente — confirming state, Escape states, save disabled |
| `Column.test.tsx` | 7 | Bom — rename flow completo, add modal |
| `Card.test.tsx` | 4 | Suficiente |
| `AddCardModal.test.tsx` | 8 | Bom |
| `Board.test.tsx` | 3 | Superficial — ver abaixo |

---

### `Board.test.tsx` só testa presença de elementos, não comportamento

```ts
it('renders all 5 columns', ...)
it('renders card titles', ...)
it('renders the board header', ...)
```

Nenhum teste cobre o comportamento de drag-and-drop nem o `handleDragEnd`. A lógica de resolução de coluna-alvo em `Board.tsx` (linhas 44–58) não tem cobertura de testes.

**Grau:** médio — gap de cobertura na lógica principal.

---

### Testes de `Column` usam `title` como `button` accessible name

```ts
await user.click(screen.getByRole('button', { name: 'To Do' }));
```

Isso funciona mas é frágil: depende que o texto exato do botão seja "To Do". Com truncation ou markup aninhado, pode quebrar. Considerar `data-testid` ou `aria-label` explícito para o botão de rename.

**Grau:** baixo — fragilidade dos seletores.

---

## 9. Testes E2E (`e2e/`)

### Testes de DnD usam `waitForTimeout` — antipadrão Playwright

```ts
await page.waitForTimeout(100);
// ...
await page.waitForTimeout(200);
```

`waitForTimeout` é sleep cego e pode tornar os testes lentos ou flaky em máquinas lentas. O padrão Playwright recomendado é aguardar por um estado observável:

```ts
// Em vez de waitForTimeout(200):
await expect(page.getByRole('button', { name: /Set up CI/ }))
  .toBeVisible({ timeout: 2000 });
```

**Grau:** médio — flakiness potencial em CI.

---

### Testes E2E de DnD verificam apenas que o card ainda existe, não onde ele está

```ts
// Após drag de Backlog → To Do:
await expect(page.getByRole('button', { name: /Set up CI\/CD pipeline/ })).toBeVisible();
```

O teste confirma que o card existe na página, mas não confirma que ele está na coluna correta. Um card que não se moveu passaria nesse teste.

**Grau:** médio — assertion fraca.

---

### Locators por classe CSS são frágeis

```ts
page.locator('.flex.flex-col.w-72').filter({ hasText: 'Backlog' })
```

Locators baseados em classes utilitárias do Tailwind quebram silenciosamente se as classes mudarem por refatoração de estilo. O padrão recomendado é usar `data-testid` ou atributos semânticos:

```html
<div data-testid="column" data-column-name="Backlog">
```

```ts
page.locator('[data-testid="column"]').filter({ hasText: 'Backlog' })
```

**Grau:** médio — fragilidade de manutenção.

---

## 10. Configuração e infraestrutura

### `next.config.ts` está vazio

```ts
const nextConfig: NextConfig = {};
```

Sem `reactStrictMode: true`. O Strict Mode dobra renders em desenvolvimento para detectar efeitos colaterais — especialmente útil para pegar bugs de `useEffect` duplicado.

**Grau:** baixo — boa prática.

---

### `tsconfig.json` target `ES2017`

```json
"target": "ES2017"
```

React 19 e Next.js 16 suportam ES2022+. Com ES2017 como target, features como `Object.hasOwn`, `Array.at()` e class fields são downcompiladas desnecessariamente. Considere `"target": "ES2022"`.

**Grau:** baixo — modernização.

---

### Sem script de `lint` no `package.json`

```json
"scripts": {
  "dev": "next dev",
  "build": "next build",
  "start": "next start",
  "test": "jest",
  "test:e2e": "playwright test"
}
```

Nenhum script de `lint` (ESLint) nem `typecheck` (`tsc --noEmit`). A verificação de tipos só acontece implicitamente no `build`. Adicionar `"lint": "next lint"` e `"typecheck": "tsc --noEmit"` permite rodar verificações independentemente e no CI.

**Grau:** médio — qualidade de CI/CD.

---

## 11. Estilo e UX

### `globals.css` — animações de modal sem `prefers-reduced-motion`

```css
@keyframes modal-fade-in { ... }
```

Usuários com `prefers-reduced-motion: reduce` configurado no sistema operacional ainda verão as animações. A prática acessível é:

```css
@media (prefers-reduced-motion: reduce) {
  .modal-content, .modal-backdrop {
    animation: none;
  }
}
```

**Grau:** baixo — acessibilidade.

---

### Altura máxima de colunas hardcoded

```html
max-h-[calc(100vh-220px)]
```

O valor `220px` é mágico e depende da altura exata do header + padding. Se o header mudar, esse cálculo quebra silenciosamente. Uma abordagem mais robusta seria usar CSS Grid com `grid-template-rows` ou `flex` no container pai.

**Grau:** baixo — manutenibilidade.

---

## Resumo por grau

| Grau | Qtd | Itens |
|---|---|---|
| **Bug / risco real** | 1 | `commitRename` chamado duas vezes no Enter |
| **Médio** | 8 | `useCallback` nas actions; dessincronização de `nameValue`; listener global de teclado; focus trap ausente; gap de cobertura em `Board`; `waitForTimeout` nos e2e; assertions fracas de DnD; ausência de lint/typecheck scripts |
| **Baixo** | 8 | `details` opcional vs obrigatório; `delete` mutação; busca O(n×m); `DragOverlay` sem animação; `aria-labelledby`; `role="button"` duplicado; `ES2017` target; `reactStrictMode`; `prefers-reduced-motion`; altura mágica no CSS |

---

## Melhorias sugeridas (priorizadas)

### P1 — Corrigir antes de crescer

1. **Focus trap nos modais** — implementar com a lib `focus-trap-react` ou manualmente. Requisito WCAG 2.1.
2. **Adicionar `"lint"` e `"typecheck"` ao `package.json`** e rodar ambos no CI. Hoje erros de tipo só são detectados no `build`.
3. **Corrigir race condition de blur+Enter em `Column`** — adicionar flag `committed` ou remover `onBlur` quando Enter for pressionado.
4. **`useCallback` nas actions do `useBoard`** — previnir re-renders desnecessários em cadeia.

### P2 — Qualidade de testes

5. **Substituir `waitForTimeout` nos e2e de DnD** por `expect(...).toBeVisible()` com timeout adequado.
6. **Melhorar assertions dos testes de DnD** — após drag, confirmar que o card está dentro da coluna de destino usando `locator` escopado à coluna.
7. **Adicionar `data-testid` nas colunas** e migrar e2e para usar `[data-testid="column"]` em vez de classes Tailwind.
8. **Testar `handleDragEnd` do `Board`** — os dois branches (drop sobre card e drop sobre coluna) não têm cobertura unit.

### P3 — Polimento técnico

9. **`details?: string` no tipo `Card`** — tornar o campo explicitamente opcional para refletir o comportamento real.
10. **`"target": "ES2022"` no tsconfig** — alinhado com o runtime alvo.
11. **`reactStrictMode: true` no `next.config.ts`** — detectar efeitos colaterais cedo.
12. **`prefers-reduced-motion` no CSS** — respeitar preferência do sistema operacional.
13. **`useEffect` de sincronização do `nameValue`** na `Column` para evitar dessincronização futura.

### P4 — Evolução futura

14. **Persistência** — `localStorage` com `JSON.stringify/parse` do `BoardState` é trivial de adicionar ao `useBoard`. Permitiria que o estado sobrevivesse a refreshes.
15. **IDs de colunas fixos** — necessário assim que houver persistência; hoje são `nanoid()` a cada mount.
16. **Undo/redo** — o modelo imutável atual facilita muito: basta manter um stack de estados anteriores.
17. **Acessibilidade de DnD via teclado** — `@dnd-kit` suporta `KeyboardSensor` nativamente; adicionar para mover cards com setas + Enter.
18. **Datas/etiquetas nos cards** — campo `dueDate?: string` e `labels?: string[]` são adições naturais ao tipo `Card` sem quebrar a estrutura atual.
