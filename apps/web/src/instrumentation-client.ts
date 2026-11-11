import { datadogRum } from "@datadog/browser-rum";
import {
  nextjsPlugin,
  onRouterTransitionStart,
} from "@datadog/browser-rum-nextjs";

import { getRumConfig, getRumInitOptions } from "@/lib/datadog/config";

const config = getRumConfig();

if (typeof window !== "undefined" && config) {
  datadogRum.init({
    ...getRumInitOptions(config, window.location.origin),
    plugins: [nextjsPlugin()],
  });
}

export { onRouterTransitionStart };
