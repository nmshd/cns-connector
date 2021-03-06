import { ConnectorClient, ConnectorRelationshipTemplate } from "@nmshd/connector-sdk";
import { DateTime } from "luxon";
import { Launcher } from "./lib/Launcher";
import { QueryParamConditions } from "./lib/QueryParamConditions";
import { createTemplate, exchangeTemplate } from "./lib/testUtils";
import { expectError, expectSuccess, ValidationSchema } from "./lib/validation";

const launcher = new Launcher();
let client1: ConnectorClient;
let client2: ConnectorClient;

beforeAll(async () => ([client1, client2] = await launcher.launch(2)), 30000);
afterAll(() => launcher.stop());

describe("Template Tests", () => {
    let template: ConnectorRelationshipTemplate;
    let templateWithUndefinedMaxNumberOfRelationships: ConnectorRelationshipTemplate;

    test("create a template", async () => {
        const response = await client1.relationshipTemplates.createOwnRelationshipTemplate({
            maxNumberOfRelationships: 1,
            expiresAt: DateTime.utc().plus({ minutes: 10 }).toString(),
            content: { a: "b" }
        });

        expectSuccess(response, ValidationSchema.RelationshipTemplate);

        template = response.result;
    });

    test("create a template with undefined maxNumberOfRelationships", async () => {
        const response = await client1.relationshipTemplates.createOwnRelationshipTemplate({
            content: { a: "A" },
            expiresAt: DateTime.utc().plus({ minutes: 1 }).toString()
        });

        templateWithUndefinedMaxNumberOfRelationships = response.result;

        expectSuccess(response, ValidationSchema.RelationshipTemplate);
        expect(templateWithUndefinedMaxNumberOfRelationships.maxNumberOfRelationships).toBeUndefined();
    });

    test("read a template with undefined maxNumberOfRelationships", async () => {
        const response = await client1.relationshipTemplates.getRelationshipTemplate(templateWithUndefinedMaxNumberOfRelationships.id);

        expectSuccess(response, ValidationSchema.RelationshipTemplate);
        expect(templateWithUndefinedMaxNumberOfRelationships.maxNumberOfRelationships).toBeUndefined();
    });

    test("see If template exists in /RelationshipTemplates/Own", async () => {
        expect(template).toBeDefined();

        const response = await client1.relationshipTemplates.getOwnRelationshipTemplates();
        expectSuccess(response, ValidationSchema.RelationshipTemplates);
        expect(response.result).toContainEqual(template);
    });

    test("see If template exists in /RelationshipTemplates/{id}", async () => {
        expect(template).toBeDefined();

        const response = await client1.relationshipTemplates.getRelationshipTemplate(template.id);
        expectSuccess(response, ValidationSchema.RelationshipTemplate);
    });

    test("expect a validation error for sending maxNumberOfRelationships 0", async () => {
        const response = await client1.relationshipTemplates.createOwnRelationshipTemplate({
            content: { a: "A" },
            expiresAt: DateTime.utc().plus({ minutes: 1 }).toString(),
            maxNumberOfRelationships: 0
        });

        expect(response.isError).toBeTruthy();
        expect(response.error.code).toBe("error.runtime.validation.invalidPropertyValue");
    });
});

describe("Serialization Errors", () => {
    test("create a template with wrong content : missing values", async () => {
        const response = await client1.relationshipTemplates.createOwnRelationshipTemplate({
            content: { a: "A", "@type": "Message" },
            expiresAt: DateTime.utc().plus({ minutes: 1 }).toString()
        });
        expectError(response, "Message.secretKey :: Value is not defined", "error.runtime.requestDeserialization");
    });

    test("create a template with wrong content : not existent type", async () => {
        const response = await client1.relationshipTemplates.createOwnRelationshipTemplate({
            content: { a: "A", "@type": "Hugo" },
            expiresAt: DateTime.utc().plus({ minutes: 1 }).toString()
        });
        expectError(response, "Type 'Hugo' was not found within reflection classes. You might have to install a module first.", "error.runtime.unknownType");
    });
});

describe("RelationshipTemplates Query", () => {
    test("query templates", async () => {
        const template = await createTemplate(client1);
        const conditions = new QueryParamConditions(template, client1)
            .addBooleanSet("isOwn")
            .addDateSet("createdAt")
            .addDateSet("expiresAt")
            .addStringSet("createdBy")
            .addStringSet("createdByDevice")
            .addNumberSet("maxNumberOfRelationships");

        await conditions.executeTests((c, q) => c.relationshipTemplates.getRelationshipTemplates(q), ValidationSchema.RelationshipTemplates);
    });

    test("query own templates", async () => {
        const template = await createTemplate(client1);
        const conditions = new QueryParamConditions(template, client1)
            .addDateSet("createdAt")
            .addDateSet("expiresAt")
            .addStringSet("createdBy")
            .addStringSet("createdByDevice")
            .addNumberSet("maxNumberOfRelationships");
        await conditions.executeTests((c, q) => c.relationshipTemplates.getOwnRelationshipTemplates(q), ValidationSchema.RelationshipTemplates);
    });

    test("query peer templates", async () => {
        const template = await exchangeTemplate(client1, client2);
        const conditions = new QueryParamConditions(template, client2)
            .addDateSet("createdAt")
            .addDateSet("expiresAt")
            .addStringSet("createdBy")
            .addStringSet("createdByDevice")
            .addNumberSet("maxNumberOfRelationships");

        await conditions.executeTests((c, q) => c.relationshipTemplates.getPeerRelationshipTemplates(q), ValidationSchema.RelationshipTemplates);
    });
});
