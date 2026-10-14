# Revisão do rascunho contra o enunciado

O critério da avaliação é **consistência e rastreabilidade entre os artefatos**. Abaixo, o que no rascunho quebra isso (ou a notação UML), e a correção proposta.

## Inconsistências entre artefatos (as mais graves)

| # | Problema | Onde | Correção proposta |
|---|----------|------|-------------------|
| 1 | O UC06 cria o agendamento com status `CONFIRMADO`, mas `StatusAgendamento` não tem esse valor (`AGENDADO, EM_EXECUCAO, FINALIZADO, CANCELADO`). | UC06 passo 8 × enum | Trocar o enum para `CONFIRMADO, EM_EXECUCAO, FINALIZADO, CANCELADO` (ou usar `AGENDADO` na especificação). |
| 2 | FE02 fala em proposta **revogada** pela oficina, mas `StatusProposta` não tem esse estado nem existe operação para revogar. | UC06 FE02 × classe | Incluir `RETIRADA` em `StatusProposta` e `retirar()` em `PropostaComercial`. |
| 3 | FA01 diz que as propostas são "descartadas", estado que não existe. | UC06 FA01 × enum | Propostas passam a `RECUSADA`; solicitação a `CANCELADA` via `cancelar()`. |
| 4 | `StatusSolicitacao.EM_ANALISE` não é usado em nenhum artefato. | enum | Remover, ou definir: `ABERTA` (sem propostas) → `EM_ANALISE` (com ≥1 proposta). Precisa aparecer no UC e no diagrama de atividades. |
| 5 | O diagrama de sequência chama `recusarConcorrentes(...)` numa linha de vida "DemaisPropostas", mas essa operação não existe em nenhuma classe. | sequência × classes | Delegar à `SolicitacaoServico` (especialista na informação: ela conhece suas propostas): `encerrarLeilao(vencedora)` percorre as demais em `loop` chamando `recusar()`. |
| 6 | O passo 9 do UC06 (notificar a oficina vencedora e as concorrentes) não aparece na sequência. | UC06 × sequência | Mensagem a um `ServicoNotificacao` (ou `notificar()` em `EmpresaParceira`). |
| 7 | FE01 (proposta expirada) não aparece na sequência: só o caminho feliz. | UC06 × sequência | Fragmento `alt [estaValida()] / [else]`. |
| 8 | O diagrama de classes põe `aceitarProposta(p)` no `Proprietario`, mas na sequência quem aceita é o `ControladorLeilao`. `ControladorLeilao` e `PainelWeb` não estão no diagrama de classes. | sequência × classes | Ou a sequência usa só objetos de domínio, ou classes de fronteira/controle (`<<boundary>>`, `<<control>>`) são declaradas e explicadas como camada de projeto. |
| 9 | `Agendamento` é criado com `new(propId, ...)`; em UML a criação é mensagem `<<create>>` com a linha de vida começando nela. | sequência | Notação de criação. |

## Diagrama de casos de uso

- Setas simples entre casos de uso (UC01→UC02→UC04→UC06) **não existem em UML**: ou é `<<include>>`, `<<extend>>`, generalização, ou não há ligação. Isso parece um fluxo de processo, não um diagrama de casos de uso.
- `UC03 <<extend>> UC02` está semanticamente errado: consultar a linha do tempo não é um comportamento opcional dentro de registrar manutenção.
- Os atores estão ligados à **fronteira**, não aos casos de uso. Cada ator precisa de associações aos UCs que realiza.
- Faltam funcionalidades do escopo: a empresa **visualizar chamados compatíveis** (o UC05 diz isso, mas não há UC); **cancelar solicitação** (FA01); a **oficina também registra manutenção** ("ou a própria oficina integrada"); o sistema **identificar empresas por região e especialidade** (candidato a `<<include>>` do UC04).
- UC07 sendo só automático pode ser `<<include>>` de UC06 (como está), ok. Não ligar o ator Empresa a ele.

## Diagrama de classes

- **Faltam as peças trocadas / serviços executados** do registro de manutenção, que o enunciado pede explicitamente. Sugestão: `ItemManutencao` (descrição, tipo: peça | serviço, quantidade, valor) em composição `1 ◆— 1..*` com `RegistroManutencao`.
- `Veiculo 1 → 1..* RegistroManutencao` obriga todo veículo a já nascer com histórico. Deve ser `0..*`. O mesmo para `Veiculo 1 → 1..* SolicitacaoServico`.
- `RegistroManutencao → EmpresaParceira` como `0..*` do lado da empresa: um registro tem **0..1** oficina executora (feita fora da plataforma → texto livre `oficinaExterna`).
- A regra "atende à região geográfica" precisa de um atributo: `raioAtendimentoKm` em `EmpresaParceira` e uma operação `atende(solicitacao): boolean`.
- `Veiculo` e `EmpresaParceira` sem `id`, diferente das outras classes.
- Ligação `RegistroManutencao ↔ Agendamento`: quando o serviço do leilão é finalizado, deveria gerar o registro na linha do tempo, fechando a rastreabilidade entre os dois subsistemas (`Agendamento.finalizar(): RegistroManutencao`).
- A justificativa "`estaValida()` impede que propostas concorrentes sejam aceitas simultaneamente" não procede: isso exige a `SolicitacaoServico` checar que ainda está aberta (`podeAceitar()`), invariante "no máximo uma proposta ACEITA por solicitação".

## Diagrama de atividades

- Faltam nós de **merge** e **fork/join**; os caminhos voltam por setas soltas.
- O ramo "validade expirada" termina o fluxo; pelo FE01 ele deveria **voltar ao comparador**.
- O ramo "não aceitar nenhuma" deveria decidir entre **aguardar mais propostas** e **cancelar a solicitação** (FA01).
- Não há o caso "nenhuma empresa compatível encontrada".
- Notificar concorrentes (recusa) ocorre em paralelo à notificação da vencedora: bom lugar para um fork.

---

# Revisão da versão 2

Resolvidos: status do agendamento, `ItemManutencao`, multiplicidades `0..*`, atores ligados aos UCs, FE de concorrência (`isAberta()`).

## Ainda inconsistente

| # | Problema | Correção proposta |
|---|----------|-------------------|
| 1 | A sequência usa `isAberta()`, `marcarComoExpirada()` e `despacharAgendamento()`, e a tabela de rastreabilidade cita `adicionarItem()` e `listarHistorico()`: **nenhuma dessas operações está no diagrama de classes**. | Toda mensagem da sequência e da tabela tem que existir como operação na classe da linha de vida que a recebe. |
| 2 | `recusarPropostasExceto(pId)` é operação de `SolicitacaoServico`, mas a seta vai para a linha de vida `OutrasPropostas`. | Seta para `Solicitacao`, que dentro de um `loop [para cada outra proposta]` chama `recusar()` em `OutrasPropostas`. |
| 3 | `Notificador` e `ControleLeilao` não existem no diagrama de classes. | Declarar como `<<control>>`/`<<boundary>>` (ou um `ServicoNotificacao` de domínio) e explicar. |
| 4 | O `alt` está desenhado como texto solto: não há moldura nem `[guarda]` / `[else]`. | Fragmento combinado de verdade. |
| 5 | `StatusSolicitacao.EM_ANALISE` continua sem uso; pior, a pré-condição pede `ABERTA` **e** propostas existentes. | Remover `EM_ANALISE`, ou definir a transição ABERTA → EM_ANALISE na primeira proposta e ajustar pré-condição, atividades e `isAberta()`. |
| 6 | FA01 cancela a solicitação, mas não há `cancelar()` em `SolicitacaoServico`. | Adicionar. |
| 7 | Regressão: sem coordenadas no `Proprietario` e sem endereço/coordenadas/raio na `EmpresaParceira`, a regra "o sistema identifica empresas **da região**" não tem suporte no modelo. | `localizacao` nos dois e `raioAtendimentoKm` + `atende(s: SolicitacaoServico): boolean` na empresa. |
| 8 | `RegistroManutencao → EmpresaParceira` com `0..*` do lado da empresa: um registro tem uma oficina executora, no máximo. Também falta a multiplicidade do lado da empresa em `PropostaComercial → EmpresaParceira` (deve ser `1`). | `0..1` e `1`. |
| 9 | `valorPago` coexiste com `calcularTotal()` e com os itens: dado redundante. | `/valorPago` derivado, ou remover um dos dois. |
| 10 | A tabela fala em **agregação** Solicitação–Proposta; o diagrama desenha associação simples. | Escolher (composição faz mais sentido: proposta não existe sem solicitação) e desenhar igual. |
| 11 | `TipoItem` usado e não declarado; `Agendamento.confirmar()` não é usado em lugar nenhum; `Veiculo` sem `id`. | Declarar / remover / adicionar. |
| 12 | Diagrama de casos de uso: setas com ponta entre ator e UC (associação é linha simples); ainda faltam "Visualizar solicitações compatíveis" (empresa), "Cancelar solicitação" (FA01) e "Identificar empresas da região" (`<<include>>` de UC04). | Ajustar. |
| 13 | O diagrama de atividades não foi refeito. | Refazer com merge, fork/join, volta ao comparador no FE01 e o ramo de cancelamento. |

## Sobre o código React

- Foge do padrão dos outros exames (Vite + TS **sem framework**, classes, CSS em arquivos, texto pt em `src/content`); tem estilos inline e texto em português misturado no componente.
- Os enums em inglês (`UNDER_ANALYSIS`) não batem com o modelo (`EM_ANALISE`). Proposta: identificadores em inglês no código, mas a tela mostra os nomes **do modelo UML** vindos de `src/content`, para a rastreabilidade ficar visível.
- A data "hoje" está fixa no código (`2026-10-14`); o "Reiniciar" não volta a proposta selecionada; depois do FE01 a proposta expirada continua selecionável.
