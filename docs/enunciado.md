# Enunciado: Estudo de Caso · Sistema Integrado de Gestão Veicular

> Ministério da Educação · Universidade Tecnológica Federal do Paraná · Campus Guarapuava · Tecnologia em Sistemas para a Internet

O setor de manutenção automotiva e gestão de frotas pessoais sofre historicamente com a falta de transparência, a descentralização de informações sobre o histórico dos veículos e a dificuldade dos proprietários em encontrar o melhor custo-benefício para reparos e revisões. Por outro lado, as oficinas mecânicas e centros automotivos buscam formas ativas e eficientes de captar clientes qualificados, utilizando dados preditivos para antecipar necessidades de manutenção antes que problemas maiores ocorram.

Para solucionar esse problema, solicita-se o desenvolvimento de um sistema, um ecossistema digital que conecta **Proprietários de Veículos** a **Empresas Prestadoras de Serviços Automotivos** (oficinas, concessionárias, centros de estética automotiva e borracharias). O sistema atua tanto na gestão preventiva e no armazenamento do histórico mecânico quanto em um modelo de mercado dinâmico baseado em orçamentos sob demanda e ofertas direcionadas.

O ecossistema opera fundamentando-se em três grandes pilares de negócio:

## 1. Gestão de Veículos e Histórico Pessoal

Cada proprietário pode cadastrar um ou mais veículos, informando dados como placa, modelo, ano, combustível e a quilometragem atual. À medida que o tempo passa, o usuário (ou a própria oficina integrada) registra as manutenções realizadas (ex: Troca de óleo, Revisão de 10.000 km, Substituição de pastilhas de freio). Cada registro armazena data, quilometragem no momento do serviço, valor pago, peças trocadas e a oficina executora, construindo uma verdadeira "linha do tempo" da saúde do veículo.

## 2. O Mecanismo de "Leilão" de Serviços (Orçamento sob Demanda)

Sempre que um veículo se aproxima de uma revisão programada ou apresenta uma necessidade corretiva (ex: "Preciso fazer a revisão de 40.000 km" ou "Meu carro está fazendo um barulho na suspensão dianteira"), o proprietário cria uma **Solicitação de Serviço** na plataforma. O sistema identifica as empresas parceiras que atendem à região geográfica do usuário e possuem especialidade no tipo de serviço demandado.

As empresas recebem o aviso e disputam o atendimento enviando **Propostas Comerciais** (orçamentos contendo valor estimado de mão de obra, peças, prazo de execução e validade da oferta).

O proprietário visualiza as propostas recebidas em um painel comparativo, podendo aceitar a que melhor lhe atender, o que automaticamente converte a proposta em um agendamento oficial e encerra o leilão para os demais concorrentes.

## 3. Ofertas Preditivas e Direcionadas (Proativas)

As empresas parceiras podem configurar campanhas ou análises baseadas nos dados históricos dos veículos cadastrados na base (desde que o proprietário tenha marcado a preferência permitindo o compartilhamento anônimo ou direto de dados para fins comerciais).

Por exemplo: se o sistema detecta, com base na quilometragem rodada e no tempo decorrido, que o fluido de freio de um grupo de veículos está próximo do vencimento, a oficina pode disparar uma oferta direcionada aos proprietários que optaram por receber propostas.

O proprietário recebe a notificação da oferta diretamente em seu painel e, caso tenha interesse, pode aceitá-la com um clique para convertê-la em um agendamento.

---

# Avaliação de Suficiência

## Escopo da Avaliação

Para esta avaliação, você deverá focar estritamente no subsistema de **Gestão de Veículos/Manutenções** e no mecanismo de **Solicitação de Orçamentos (Leilão de Serviços)**, conforme os limites descritos abaixo:

1. **Gestão de Veículos e Histórico:** O proprietário deve ser capaz de registrar seus veículos na plataforma e manter um histórico centralizado de todas as manutenções preventivas e corretivas já realizadas (incluindo dados como data, quilometragem, serviços executados e oficina responsável).
2. **Leilão de Serviços e Propostas:** Quando um veículo necessitar de intervenção, o proprietário poderá emitir uma solicitação de orçamento detalhando a demanda. As empresas parceiras cadastradas na plataforma recebem o chamado e competem enviando propostas comerciais (com valores, prazos e condições) para que o proprietário analise e decida qual proposta aceitar para agendamento.

## O Que Deve Ser Entregue

Com base exclusivamente nas diretrizes do escopo acima, elabore a solução utilizando a notação UML. **A consistência e a rastreabilidade entre os artefatos entregues serão critérios fundamentais de avaliação.**

1. **Modelagem de Requisitos:**
   - Apresente o Diagrama de Casos de Uso que delimite as fronteiras do subsistema descrito, especificando os atores e as principais funcionalidades envolvidas.
   - Escolha o fluxo mais crítico do escopo e apresente a sua Especificação de Caso de Uso textual detalhada (contendo atores, pré/pós-condições, fluxo principal e fluxos alternativos/exceções).
2. **Modelagem Comportamental:**
   - Elabore o Diagrama de Atividades que represente o fluxo lógico e as tomadas de decisão do processo de leilão e envio de propostas de serviços.
3. **Projeto Estrutural:**
   - Elabore o Diagrama de Classes que represente o modelo de domínio do problema proposto. O diagrama deve contemplar as classes estruturais, seus principais atributos, operações e os devidos relacionamentos e multiplicidades que sustentam as regras do negócio.
4. **Modelagem Dinâmica:**
   - Elabore um Diagrama de Sequência ilustrando a colaboração entre os objetos durante a execução de uma etapa crítica da interação entre a empresa e o proprietário no contexto de propostas.
