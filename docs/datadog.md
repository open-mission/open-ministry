# Datadog no OpenMinistry

## O que está instrumentado

- RUM no navegador: sessões, views, recursos, interações, long tasks e session replay em 20% das sessões.
- APM no servidor: traces do Next.js (rotas, renderização e fetch) via OpenTelemetry.
- Logs de erro do servidor: erros capturados por `onRequestError` e eventos críticos via `logServerEvent`.

## Arquitetura

O projeto está no plano Hobby da Vercel, que não permite Trace Drains nem Log Drains. Por isso a telemetria vai direto para a Datadog:

- Traces: `https://vercel.integrations.otlp.datadoghq.com/v1/traces`
- Logs: `https://http-intake.logs.datadoghq.com/api/v2/logs`

Se o projeto migrar para a Vercel Pro, os Drains oficiais podem substituir o export direto sem mudar a instrumentação da aplicação.

## Variáveis de ambiente

| Variável | Onde | Valor |
| --- | --- | --- |
| `NEXT_PUBLIC_DD_APPLICATION_ID` | Cliente | ID da aplicação RUM |
| `NEXT_PUBLIC_DD_CLIENT_TOKEN` | Cliente | Client token público do RUM |
| `NEXT_PUBLIC_DD_SITE` | Cliente | `datadoghq.com` |
| `NEXT_PUBLIC_DD_SERVICE` | Cliente | `openministry` |
| `DD_API_KEY` | Servidor (segredo) | API key criada na Datadog |
| `DD_SITE` | Servidor | `datadoghq.com` |
| `DD_SERVICE` | Servidor | `openministry` |

## Configuração local

1. Preencha as variáveis `NEXT_PUBLIC_DD_*` no `.env.local`.
2. Crie uma API key em **Organization Settings > API Keys** na Datadog.
3. Adicione `DD_API_KEY=<chave>` ao `.env.local`.
4. Rode `bun dev`.

Sem `DD_API_KEY`, o RUM continua funcionando e o tracing/logs do servidor ficam desligados.

## Configuração na Vercel

Adicione as mesmas variáveis em **Production** e **Preview**. Marque `DD_API_KEY` como sensível. As variáveis `NEXT_PUBLIC_*` são embutidas no bundle durante o build, então é necessário um novo deploy para aplicá-las.

## Verificação

- RUM: abra o app e confira sessões no **RUM Explorer**. O session replay aparece em 20% das sessões.
- RUM para APM: em uma chamada same-origin, o header `traceparent` deve aparecer na aba Network.
- APM: em **APM > Services**, procure o serviço `openministry`.
- Logs: provoque um erro de servidor e busque `service:openministry status:error` no **Log Explorer**.

## Limitações

- Logs de build, CDN e o stdout completo de todas as funções exigem Vercel Pro + Log Drain.
- Trace Drain oficial exige Vercel Pro.
- Não há dashboards ou monitores criados por este trabalho.

## Privacidade

- Session replay usa `mask-user-input`.
- A identificação do usuário envia somente o ID interno (`setUser({ id })`), sem e-mail ou nome.
- Logs de erro enviam apenas o caminho (sem query string) e o método da requisição, nunca headers, cookies, authorization ou corpo.

## Desligar

Remova `NEXT_PUBLIC_DD_APPLICATION_ID`/`NEXT_PUBLIC_DD_CLIENT_TOKEN` para desligar o RUM. Remova `DD_API_KEY` para desligar traces e logs do servidor. Nenhum caminho lança erro quando as variáveis estão ausentes.
