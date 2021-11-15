import { ModuleConfiguration, RuntimeModule } from "@nmshd/runtime";
import { ConnectorRuntime } from "./ConnectorRuntime";

export interface ConnectorRuntimeModuleConfiguration extends ModuleConfiguration {
    someConnectorOnlyProperty: string;
}

export abstract class ConnectorRuntimeModule<TConfig extends ConnectorRuntimeModuleConfiguration = ConnectorRuntimeModuleConfiguration> extends RuntimeModule<
    TConfig,
    ConnectorRuntime
> {
    public baseDirectory: string;
}