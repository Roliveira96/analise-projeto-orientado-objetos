# Rascunho inicial (montado com o Gemini)

> Ponto de partida, **não é a versão final**. Os problemas encontrados estão em [`revisao-rascunho.md`](revisao-rascunho.md).

## 1. Modelagem de Requisitos

### Casos de uso listados

- **UC01: Manter Veículos:** cadastrar, atualizar dados básicos e quilometragem do veículo.
- **UC02: Registrar Manutenção:** registrar histórico mecânico preventivo ou corretivo (data, km, itens, oficina executora).
- **UC03: Consultar Linha do Tempo:** visualizar o histórico mecânico consolidado do veículo.
- **UC04: Criar Solicitação de Serviço:** abrir chamada de orçamento detalhando a demanda (revisão programada ou corretiva).
- **UC05: Submeter Proposta Comercial:** oficina parceira visualiza chamadas compatíveis e envia valores de peças, mão de obra, prazo e validade.
- **UC06: Analisar e Aceitar Proposta:** proprietário compara as propostas concorrentes e aceita a melhor oferta.
- **UC07: Gerar Agendamento de Serviço:** conversão automática da proposta aceita em agendamento oficial e encerramento do leilão.

Relações desenhadas: UC03 `<<extend>>` UC02; UC06 `<<include>>` UC07; setas simples sem estereótipo entre UC01→UC02→UC04→UC06 e UC05→UC07. Atores (Proprietário, Empresa Parceira) ligados à fronteira, não a casos de uso específicos.

### Especificação: UC06 - Analisar e Aceitar Proposta Comercial

- **Atores:** Proprietário (primário), Empresa Parceira (secundário/notificado), Sistema (automático).
- **Pré-condições:** proprietário autenticado; solicitação `ABERTA`; ao menos uma proposta `EM_ANALISE`.
- **Pós-condições:** proposta escolhida `ACEITA`; `Agendamento` gerado; solicitação `CONCLUIDA`; demais propostas `RECUSADA`; oficinas notificadas.
- **Fluxo principal:** (1) seleciona solicitação aberta; (2) sistema exibe comparativo; (3) seleciona e clica "Aceitar Proposta"; (4) sistema valida validade; (5) proposta → `ACEITA`; (6) solicitação → `CONCLUIDA`; (7) demais → `RECUSADA`; (8) gera `Agendamento` com status `CONFIRMADO`; (9) notifica vencedora e atualiza painel das concorrentes; (10) exibe comprovante.
- **FA01:** nenhuma proposta agrada → solicitação `CANCELADA`, propostas descartadas.
- **FA02:** no passo 2, visualizar detalhes cadastrais da oficina.
- **FE01:** proposta expirada → marca `EXPIRADA`, bloqueia aceite, alerta, recarrega painel.
- **FE02:** proposta revogada pela oficina → alerta e atualiza a listagem.

## 2. Diagrama de Atividades

Raias Proprietário / Sistema / Empresa Parceira: criar solicitação → identificar empresas da região/especialidade → empresa analisa → decisão "deseja participar?" (ignorar | elaborar e enviar proposta) → vincular proposta → proprietário analisa no comparador → decisão "aceitar alguma oferta?" → confirmar aceite → decisão "validade expirada?" (erro | ACEITA → recusar demais → encerrar leilão → criar agendamento → notificar empresa) → fim.

## 3. Diagrama de Classes

- **Proprietario:** id, nome, email, telefone, latitude, longitude; `solicitarServico(...)`, `aceitarProposta(p)`.
- **Veiculo:** placa, modelo, ano, tipoCombustivel, quilometragemAtual; `atualizarKm(novaKm)`.
- **RegistroManutencao:** id, data, quilometragemNoServico, valorPago, tipoManutencao; `detalharServico()`.
- **SolicitacaoServico:** id, descricaoProblema, tipoServico, dataAbertura, status; `encerrarLeilao()`, `adicionarProposta(p)`.
- **PropostaComercial:** id, valorMaoDeObra, valorPecas, prazoExecucaoDias, dataValidade, status; `calcularValorTotal()`, `estaValida()`, `aceitar()`, `recusar()`.
- **EmpresaParceira:** cnpj, razaoSocial, endereco, especialidades, latitude, longitude; `enviarProposta(sol, ...)`.
- **Agendamento:** id, dataHora, status; `confirmar()`.
- Multiplicidades: Proprietario 1 → 1..* Veiculo; Veiculo 1 → 1..* RegistroManutencao; Veiculo 1 → 1..* SolicitacaoServico; Solicitacao 1 → 0..* Proposta; Proposta 1 → 0..1 Agendamento; RegistroManutencao 0..* → EmpresaParceira; Proposta 0..* → EmpresaParceira.

Enumerações: `TipoManutencao` (PREVENTIVA, CORRETIVA); `TipoServico` (REVISAO_PERIODICA, FREIO, SUSPENSAO, TROCA_OLEO, ESTETICA, PNEUS); `StatusSolicitacao` (ABERTA, EM_ANALISE, CONCLUIDA, CANCELADA); `StatusProposta` (EM_ANALISE, ACEITA, RECUSADA, EXPIRADA); `StatusAgendamento` (AGENDADO, EM_EXECUCAO, FINALIZADO, CANCELADO).

## 4. Diagrama de Sequência

Linhas de vida: Proprietario, PainelWeb, ControladorLeilao, PropostaEscolhida, DemaisPropostas, Solicitacao, AgendamentoServico.

1 `aceitar(pId)` → 2 `confirmarAceite(propId)` → 3 `estaValida()` → 4 `true` → 5 `aceitar()` → 6 `recusarConcorrentes(exceto: propId)` → 7 `encerrarLeilao()` → 8 `new(propId, dataAgendamento)` → 9 `agendamentoCriado` → 10 `sucesso(recibo)` → 11 `exibeRecibo`.

## Justificativas

- Escopo: subsistemas 1 e 2; ofertas preditivas fora.
- `estaValida()` checa expiração e status, "impedindo que propostas concorrentes sejam aceitas simultaneamente".
- `RegistroManutencao` liga `Veiculo` e `EmpresaParceira`, permitindo catalogar manutenções feitas fora do leilão.

---

# Versão 2 do Gemini (após a primeira revisão)

Mudanças em relação à versão 1:

- Enums mantidos; agendamento agora nasce `AGENDADO` (consistente com `StatusAgendamento`).
- `ItemManutencao` (id, descricao, quantidade, valorUnitario, tipoItem) em composição `1 → 1..*` com `RegistroManutencao`; `RegistroManutencao.detalharServico()` virou `calcularTotal()`.
- Multiplicidades `Veiculo 1 → 0..*` para registros e solicitações; `Proprietario → 0..* Veiculo`.
- Atores ligados direto aos UCs; UC06 `<<include>>` UC07; Empresa Parceira ligada a UC05 e UC07.
- `Proprietario` perdeu latitude/longitude e `aceitarProposta`; `EmpresaParceira` perdeu endereço e coordenadas; `enviarProposta` virou `criarProposta`.
- `SolicitacaoServico` ganhou `recusarPropostasExceto(id)`.
- UC06 reescrito: passo 4 checa solicitação `ABERTA`, FE02 virou "solicitação já encerrada" (concorrência), FA01 cancela com propostas `RECUSADA`.
- Sequência: ControleLeilao, Solicitacao, PropostaEscolhida, OutrasPropostas, Agendamento, Notificador; mensagens `isAberta()`, `estaValida()`, `aceitar()`, `recusarPropostasExceto(pId)`, `encerrarLeilao()`, `<<create>>(propostaId)`, `despacharAgendamento(agendamento)`, ramo `marcarComoExpirada()`.
- Proposta de app em React com um `AuctionStepVisualizer` e uma tabela de rastreabilidade (requisito → UC → elemento estrutural → mensagem).
