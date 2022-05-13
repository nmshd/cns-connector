import { SubscriptionTarget } from "@js-soft/ts-utils";
import { DataEvent, Event } from "@nmshd/runtime";
import amqp from "amqplib";
import { ConnectorRuntimeModule, ConnectorRuntimeModuleConfiguration } from "../../ConnectorRuntimeModule";

export interface AMQPPublisherModuleConfiguration extends ConnectorRuntimeModuleConfiguration {
    url?: string;
    exchange?: {
        name: string;
        type?: "direct" | "topic" | "headers" | "fanout" | "match";
    };
}

export default class AMQPPublisherModule extends ConnectorRuntimeModule<AMQPPublisherModuleConfiguration> {
    private readonly eventSubscriptions: { target: SubscriptionTarget<unknown>; subscriptionId: number }[] = [];

    private connection?: amqp.Connection;
    private channel?: amqp.Channel;

    public init(): void {
        // Nothing to do here
    }

    public async start(): Promise<void> {
        const url = this.configuration.url;
        if (!url) throw new Error("Cannot start the module, the ampq url is not defined.");

        this.connection = await amqp.connect(url);
        this.channel = await this.connection.createChannel();

        const exchange = this.configuration.exchange;
        if (exchange) {
            await this.channel.assertExchange(exchange.name, exchange.type ?? "fanout");
        }

        const trigger = "**";
        const subscriptionId = this.runtime.eventBus.subscribe(trigger, this.handleEvent.bind(this));
        this.eventSubscriptions.push({ target: trigger, subscriptionId });
    }

    private handleEvent(event: Event) {
        const data = event instanceof DataEvent ? event.data : {};
        const buffer = Buffer.from(JSON.stringify(data));

        const exchangeName = this.configuration.exchange?.name ?? "";

        const sent = this.channel!.publish(exchangeName, event.namespace, buffer);
        if (!sent) {
            this.logger.error(`Publishing event '${event.namespace}' to exchange '${exchangeName}' failed.`);
        }
    }

    public async stop(): Promise<void> {
        for (const subscription of this.eventSubscriptions) {
            this.runtime.eventBus.unsubscribe(subscription.target, subscription.subscriptionId);
        }

        await this.channel?.close().catch((e) => this.logger.error("Could not close the RabbitMQ channel", e));
        await this.connection?.close().catch((e) => this.logger.error("Could not close the RabbitMQ connection", e));
    }
}
