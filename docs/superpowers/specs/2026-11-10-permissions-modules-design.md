# Acesso por módulos, papéis e departamentos — Design

**Status:** proposta para aprovação
**Data:** 2026-11-10

## Intenção

Dar aos administradores da igreja controle sobre os módulos habilitados e sobre as permissões padrão dos papéis. Permitir que líderes deleguem acessos a membros dentro dos próprios departamentos, sem transformar a liderança local em acesso administrativo à igreja inteira.

## Objetivos

- Ter um catálogo de módulos do produto, começando por agenda, escalas, músicas e avisos.
- Permitir que um administrador habilite/desabilite cada módulo para a igreja e que cada departamento decida se o utiliza.
- Definir permissões padrão para administrador, líder de departamento e membro; o membro começa com leitura dos módulos comuns e não pode cadastrar músicas por padrão.
- Permitir concessões individuais adicionais, limitadas ao departamento e às permissões que o concedente pode delegar.
- Aplicar a autorização no servidor, de forma consistente entre páginas, consultas e mutações.
- Preservar o isolamento de dados por igreja que já existe via RLS.

## Fora de escopo

- Criar papéis arbitrários ou uma linguagem genérica de políticas.
- Permitir a um líder alterar módulos disponíveis para toda a igreja, promover líderes, conceder privilégios administrativos ou administrar outro departamento.
- Tratar os nomes de funções departamentais (por exemplo, “Vocal”) como permissões automaticamente. As funções seguem sendo atribuições organizacionais nesta entrega.
- Remover o papel global `user.role` usado pelo plugin admin do Better Auth para impersonação.

## Restrições e estado atual

- `src/lib/auth.ts` registra o plugin `organization` do Better Auth; os papéis de igreja são guardados em `member.role` (`owner`, `admin`, `member`). O plugin `admin` é usado para impersonação; as rotas administrativas HTTP dele estão bloqueadas.
- `department_member.is_leader` representa liderança local. Um usuário pode liderar um departamento e ser membro em outro, portanto `leader` não deve ser gravado como papel global da organização.
- `src/lib/departments.ts` resolve acesso de liderança no departamento, enquanto `src/app/actions/departments.ts` aplica parte das verificações nas mutações.
- O catálogo atual em `src/lib/modules/registry.ts` contém apenas `music`; `department_module` habilita módulos por departamento. A decisão confirmada é adicionar disponibilidade por igreja sem remover a escolha departamental: um módulo só pode ser usado quando está habilitado na igreja e no departamento relevante.
- O banco usa RLS para isolamento por igreja. As mutações de domínio passam por server actions que verificam autorização; RLS não substitui autorização por ação.
- Better Auth oferece RBAC e permissões dinâmicas por organização. Como o papel do membro Better Auth é organizacional, a relação de liderança e as concessões restritas a departamentos continuam sendo contexto ABAC da aplicação.

## Abordagens consideradas

1. **Somente RBAC do Better Auth.** Não representa com segurança liderança limitada a um departamento nem concessões individuais dentro dele.
2. **RBAC do Better Auth mais ABAC do domínio — escolhida.** Better Auth continua responsável pela identidade e pelo papel organizacional. Um serviço de autorização do OpenMinistry combina papel, módulo habilitado, departamento relacionado e concessões individuais. Esta opção reutiliza o modelo atual sem dar escopo de igreja inteira ao líder.
3. **Motor de autorização inteiramente próprio.** Daria flexibilidade, mas duplicaria responsabilidades de autenticação e papéis que o projeto já mantém com Better Auth.

## Design escolhido

### Papéis e escopo

- **Administrador/owner:** alcance da igreja ativa; administra módulos e configurações de permissões.
- **Líder:** papel contextual, válido somente quando o usuário é líder do departamento consultado. Pode gerenciar esse departamento e delegar permissões permitidas aos seus membros.
- **Membro:** permissões padrão configuradas pela igreja; inicialmente leitura dos módulos comuns citados acima.
- **Música:** membros com acesso ao módulo podem ler o repertório; cadastrar música é permitido por padrão a líderes do departamento com Música ativa e administradores. Outras ações de escrita devem ser configuradas separadamente, não inferidas de `create`.
- Uma pessoa pode ser líder em um departamento e membro em outro. Toda decisão que envolva um departamento deve avaliar o vínculo com aquele departamento, não apenas um papel armazenado na igreja.

### Módulos e permissões

- Manter um registro central de módulos e das ações suportadas por cada módulo; a navegação e a ativação não são controles de segurança.
- Módulos iniciais: `agenda`, `schedules`, `music` e `announcements`, mapeados às funcionalidades existentes de agenda/eventos, escalas, repertório e avisos/notificações.
- Persistir disponibilidade em dois níveis: o administrador habilita o módulo para a igreja; depois, o módulo pode ser ativado/desativado em cada departamento. A ativação departamental continua sob controle de administradores ou líderes daquele departamento, em linha com a capacidade existente. Um módulo desligado na igreja nega seu uso normal em todos os departamentos; um módulo desligado em um departamento nega seu uso nesse departamento, mesmo que exista outra permissão. As configurações administrativas necessárias para reativá-lo permanecem acessíveis.
- Defaults propostos para preservar o uso atual: módulos iniciais disponíveis na igreja; `agenda`, `schedules` e `announcements` ativos em todos os departamentos; `music` mantém a ativação seletiva por departamento (opt-in, para que departamentos como limpeza não recebam o módulo sem necessidade). Módulos futuros começam desativados na igreja até o administrador habilitá-los.
- Persistir as permissões padrão por papel, módulo e ação de forma configurável por igreja. O vocabulário de recursos e ações é finito e declarado no código/Access Control do Better Auth; não aceitar permissões ou ações arbitrárias fornecidas pelo cliente.
- O avaliador de permissões combina a política padrão do papel com o contexto ABAC. Para um módulo departamental, um membro tem acesso quando ele está habilitado na igreja, ativo em ao menos um departamento ao qual a pessoa pertence, e a ação está permitida pelo papel ou por uma concessão individual. A liderança e as concessões individuais são avaliadas no departamento em questão.
- Concessões individuais são aditivas, nunca substituem a barreira de módulo desligado, o vínculo com a igreja ou o escopo departamental. Um líder só pode conceder dentro do departamento e dentro das ações que ele próprio pode delegar. Promoção a líder e concessões administrativas permanecem exclusivas do administrador.

### Autorização e dados

- Criar um avaliador central no servidor (por exemplo, `can(user, action, module, scope)`) e usá-lo em server actions, carregadores de dados e proteção de rotas. Ocultar botões ou itens de navegação é apenas apresentação.
- O avaliador deve obter identidade e papel da sessão/organização do Better Auth; não confiar em papel, igreja, departamento ou permissões enviados pelo navegador.
- O modelo persistido precisa distinguir: módulo habilitado por igreja; permissões padrão de papéis por igreja; e concessões individuais com departamento, módulo, ação, autor e timestamps. A restrição de escopo deve ser validada também ao gravar concessões.
- Recursos sem vínculo a departamento são avaliados no escopo da igreja: liderança, por si só, não amplia as permissões de membro nesses recursos. Para eventos, preservar a regra atual: um líder pode alterar o cronograma se o evento estiver associado a pelo menos um departamento que ele lidera; evento sem departamento não é gerenciável pelo líder.
- Manter RLS como fronteira de isolamento entre igrejas. Toda mutação continua exigindo verificação de autorização na aplicação antes do acesso ao banco.
- Invalidar caches de acesso ao alterar módulos, políticas, liderança, membros ou concessões para que revogações tenham efeito imediato.

### Migração e compatibilidade

- Adicionar disponibilidade por igreja sem remover nem achatar `department_module`. Preservar os registros de Música por departamento; inicializar a disponibilidade global dos módulos existentes para manter as funcionalidades atuais.
- Inicializar `agenda`, `schedules` e `announcements` como ativos nos departamentos atuais e em novos departamentos; manter `music` opt-in por departamento. Módulos futuros não recebem disponibilidade nem ativação departamental automaticamente.
- Fazer a verificação de permissões retrocompatível com os dados atuais. Um módulo não pode ficar utilizável sem disponibilidade na igreja e, quando aplicável, ativação no departamento; manter o vínculo departamental como parte da autorização.
- Inventariar todas as rotas, loaders e server actions por módulo antes de migrá-los; o catálogo não deve liberar funcionalidades apenas por exibir um item no menu.

## Requisitos observáveis para o plano de implementação

- Desativar um módulo para a igreja impede que membros e líderes usem suas rotas ou mutações em todos os departamentos. Desativá-lo apenas para um departamento impede o uso naquele departamento, sem afetar os outros.
- Para Música, membro pode ler, mas não cadastrar músicas por padrão; líder do departamento com o módulo ativo e administrador podem cadastrar.
- Um líder pode gerenciar/delegar no próprio departamento, mas não em outro departamento da mesma igreja nem em outra igreja.
- Um membro recebe somente as ações padrão configuradas; uma concessão individual permite apenas as ações e o escopo nela especificados.
- Administradores continuam podendo administrar a igreja, papéis e módulos; usuários não administradores não conseguem promover líderes nem modificar política global.
- Uma revogação de acesso, remoção de liderança ou desligamento de módulo invalida acesso sem depender do vencimento natural de cache.
- O menu pode refletir permissões, mas chamadas diretas às server actions e rotas protegidas também são negadas sem autorização.

## Decisões deixadas ao plano/implementador

- Fazer o inventário definitivo das rotas/ações cobertas por cada módulo e escolher a menor granularidade de ações necessária, evitando permissões genéricas como `manage` quando operações distintas exigirem controle separado.
- Verificar as APIs e o schema de Access Control/dynamic access control da versão Better Auth instalada (`1.7.18`) antes de decidir quais políticas organizacionais ficam no plugin e quais ficam nas tabelas do domínio. A liderança departamental e as concessões individuais não podem ser modeladas como papel organizacional amplo.
- Definir as telas administrativas usando os padrões existentes de `/dashboard/settings` e da página do departamento, incluindo estados de módulo desligado e permissões herdadas/concedidas.
- Definir a auditoria e a política de revogação das concessões, cobrindo autor, alvo, escopo e ação.
- Criar migrações e testes de unidade/integrados para matriz de papéis, limites ABAC, grants, caminhos de negação e compatibilidade com os dados de módulos atuais.

## Referências

- Código atual: `src/lib/auth.ts`, `src/db/schema/auth.ts`, `src/db/schema/departments.ts`, `src/db/schema/modules.ts`, `src/lib/departments.ts`, `src/lib/modules/registry.ts`, `src/lib/modules/service.ts`, `src/app/actions/departments.ts` e `src/app/actions/modules.ts`.
- Better Auth Organization plugin: <https://www.better-auth.com/docs/plugins/organization>
