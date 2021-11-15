import path from "path";
import swaggerUi, { SwaggerUiOptions } from "swagger-ui-express";
import { SwaggerOptions } from "typescript-rest";
import YAML from "yamljs";
import { ConnectorRuntimeModule, ConnectorRuntimeModuleConfiguration } from "../../ConnectorRuntimeModule";
import { HttpMethod } from "../httpServer/HttpMethod";
import HttpServerModule from "../httpServer/HttpServerModule";

export interface CoreHttpApiModuleConfiguration extends ConnectorRuntimeModuleConfiguration {
    docs: {
        enabled: boolean;
    };
}

export default class CoreHttpApiModule extends ConnectorRuntimeModule<CoreHttpApiModuleConfiguration> {
    private httpServerModule: HttpServerModule;

    public init(): void {
        this.httpServerModule = this.runtime.modules.getByName<HttpServerModule>("httpServer");

        if (this.configuration.docs.enabled) {
            this.addDocumentation();
        }

        this.httpServerModule.addControllers(["controllers/*.js", "controllers/*.ts", "!controllers/*.d.ts"], this.baseDirectory);
    }

    private addDocumentation() {
        this.httpServerModule.addEndpoint(HttpMethod.Get, "/api-docs*", false, (_req, res) => {
            res.redirect(301, "/docs/swagger/");
        });

        this.httpServerModule.addEndpoint(HttpMethod.Get, "/docs", false, (_req, res) => {
            res.redirect(301, "/docs/swagger/");
        });

        this.useOpenApi();
        this.useSwagger({
            endpoint: "docs/swagger/",
            swaggerUiOptions: {
                customfavIcon: "https://enmeshed.eu/favicon.ico",
                customSiteTitle: "Business Connector API",
                customCss:
                    ".swagger-ui .topbar {background-color: #29235c;}" +
                    ".renderedMarkdown table th {border: 1px solid black; border-collapse: collapse}" +
                    ".renderedMarkdown table td {border: 1px solid black; border-collapse: collapse}"
            },
            filePath: path.resolve(__dirname, "./openapi.yml")
        });

        this.useRapidoc();
    }

    private useRapidoc() {
        this.httpServerModule.addEndpoint(HttpMethod.Get, "/rapidoc/rapidoc-min.js", false, (_req, res) => {
            res.sendFile(require.resolve("rapidoc"));
        });

        this.httpServerModule.addEndpoint(HttpMethod.Get, "/docs/rapidoc", false, (_req, res) => {
            res.setHeader("Content-Security-Policy", "script-src 'self' 'unsafe-eval' 'unsafe-inline'; img-src data: https://enmeshed.eu");

            res.send(`
                <!doctype html>
                    <head>
                        <title>Business Connector API</title>
                        <link rel="icon" href="https://enmeshed.eu/favicon.ico" />
                        <meta charset="utf-8">
                        <link href="https://fonts.googleapis.com/css2?family=Open+Sans:wght@300;600&amp;family=Roboto+Mono&amp;display=swap" rel="stylesheet">
                        <script type="module" src="/rapidoc/rapidoc-min.js"></script>
                    </head>
                    <body>
                        <rapi-doc
                            spec-url="/docs/json"
                            regular-font="Open Sans"
                            mono-font="Roboto Mono"
                            show-header="false"
                            bg-color="#2B303B"
                            text-color="#dee3ec"
                            theme="dark"
                            schema-description-expanded="true"
                            default-schema-tab="example"
                        > </rapi-doc>
                    </body>
                </html>
            `);
        });
    }

    private useOpenApi() {
        const swaggerDocument = this.loadOpenApiSpec();

        this.httpServerModule.addEndpoint(HttpMethod.Get, "/docs/json", false, (req, res) => {
            res.send(swaggerDocument);
        });

        this.httpServerModule.addEndpoint(HttpMethod.Get, "/docs/yaml", false, (req, res) => {
            res.set("Content-Type", "text/vnd.yaml");
            res.send(YAML.stringify(swaggerDocument, 1000));
        });
    }

    private useSwagger(options: SwaggerOptions) {
        const spec = this.loadOpenApiSpec();

        const swaggerUiOptions: SwaggerUiOptions = {
            explorer: true,
            swaggerOptions: options
        };

        const handlers = swaggerUi.serve;
        handlers.push(swaggerUi.setup(spec, swaggerUiOptions));

        this.httpServerModule.addMiddleware(path.posix.join("/", options.endpoint!), false, ...handlers);
    }

    private loadOpenApiSpec() {
        const swaggerDocument = YAML.load(path.join(this.baseDirectory, "openapi.yml"));
        return swaggerDocument;
    }

    public start(): void {
        // Nothing to do here
    }

    public stop(): void {
        // Nothing to do here
    }
}