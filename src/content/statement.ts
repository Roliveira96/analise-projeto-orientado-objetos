/** Texto do estudo de caso, como entregue pelo professor (pilares 1 a 3). */
export interface StatementBlock {
  kind: 'heading' | 'paragraph';
  text: string;
}

export const statement: StatementBlock[] = [
  { kind: 'paragraph', text: "O setor de manutenção automotiva e gestão de frotas pessoais sofre historicamente com a falta de transparência, a descentralização de informações sobre o histórico dos veículos e a dificuldade dos proprietários em encontrar o melhor custo-benefício para reparos e revisões. Por outro lado, as oficinas mecânicas e centros automotivos buscam formas ativas e eficientes de captar clientes qualificados, utilizando dados preditivos para antecipar necessidades de manutenção antes que problemas maiores ocorram." },
  { kind: 'paragraph', text: "Para solucionar esse problema, solicita-se o desenvolvimento de um sistema, um ecossistema digital que conecta <b>Proprietários de Veículos</b> a <b>Empresas Prestadoras de Serviços Automotivos</b> (oficinas, concessionárias, centros de estética automotiva e borracharias). O sistema atua tanto na gestão preventiva e no armazenamento do histórico mecânico quanto em um modelo de mercado dinâmico baseado em orçamentos sob demanda e ofertas direcionadas." },
  { kind: 'paragraph', text: "O ecossistema opera fundamentando-se em três grandes pilares de negócio:" },
  { kind: 'heading', text: "1. Gestão de Veículos e Histórico Pessoal" },
  { kind: 'paragraph', text: "Cada proprietário pode cadastrar um ou mais veículos, informando dados como placa, modelo, ano, combustível e a quilometragem atual. À medida que o tempo passa, o usuário (ou a própria oficina integrada) registra as manutenções realizadas (ex: Troca de óleo, Revisão de 10.000 km, Substituição de pastilhas de freio). Cada registro armazena data, quilometragem no momento do serviço, valor pago, peças trocadas e a oficina executora, construindo uma verdadeira \"linha do tempo\" da saúde do veículo." },
  { kind: 'heading', text: "2. O Mecanismo de \"Leilão\" de Serviços (Orçamento sob Demanda)" },
  { kind: 'paragraph', text: "Sempre que um veículo se aproxima de uma revisão programada ou apresenta uma necessidade corretiva (ex: \"Preciso fazer a revisão de 40.000 km\" ou \"Meu carro está fazendo um barulho na suspensão dianteira\"), o proprietário cria uma <b>Solicitação de Serviço</b> na plataforma. O sistema identifica as empresas parceiras que atendem à região geográfica do usuário e possuem especialidade no tipo de serviço demandado." },
  { kind: 'paragraph', text: "As empresas recebem o aviso e disputam o atendimento enviando <b>Propostas Comerciais</b> (orçamentos contendo valor estimado de mão de obra, peças, prazo de execução e validade da oferta)." },
  { kind: 'paragraph', text: "O proprietário visualiza as propostas recebidas em um painel comparativo, podendo aceitar a que melhor lhe atender, o que automaticamente converte a proposta em um agendamento oficial e encerra o leilão para os demais concorrentes." },
  { kind: 'heading', text: "3. Ofertas Preditivas e Direcionadas (Proativas)" },
  { kind: 'paragraph', text: "As empresas parceiras podem configurar campanhas ou análises baseadas nos dados históricos dos veículos cadastrados na base (desde que o proprietário tenha marcado a preferência permitindo o compartilhamento anônimo ou direto de dados para fins comerciais)." },
  { kind: 'paragraph', text: "Por exemplo: se o sistema detecta, com base na quilometragem rodada e no tempo decorrido, que o fluido de freio de um grupo de veículos está próximo do vencimento, a oficina pode disparar uma oferta direcionada aos proprietários que optaram por receber propostas." },
  { kind: 'paragraph', text: "O proprietário recebe a notificação da oferta diretamente em seu painel e, caso tenha interesse, pode aceitá-la com um clique para convertê-la em um agendamento." },
];
