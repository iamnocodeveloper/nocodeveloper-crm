CREATE TABLE "saas_audit_log" (
	"id" text PRIMARY KEY NOT NULL,
	"actor_user_id" text,
	"actor_email" text,
	"organization_id" text,
	"action" text NOT NULL,
	"detail" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "saas_integration" (
	"key" text PRIMARY KEY NOT NULL,
	"enabled" boolean DEFAULT false NOT NULL,
	"config" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"secret" jsonb,
	"webhook_secret" jsonb,
	"last_test_at" timestamp,
	"last_test_ok" boolean,
	"last_test_message" text,
	"updated_by" text,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "saas_plan" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"price_cents" integer DEFAULT 0 NOT NULL,
	"currency" text DEFAULT 'USD' NOT NULL,
	"max_messages_month" integer,
	"max_users" integer,
	"max_whatsapp_numbers" integer DEFAULT 1 NOT NULL,
	"providers" jsonb DEFAULT '["waha","meta","zernio"]'::jsonb NOT NULL,
	"woocommerce" boolean DEFAULT true NOT NULL,
	"is_default" boolean DEFAULT false NOT NULL,
	"archived" boolean DEFAULT false NOT NULL,
	"stripe_price_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "saas_tenant" (
	"organization_id" text PRIMARY KEY NOT NULL,
	"plan_id" text,
	"status" text DEFAULT 'trial' NOT NULL,
	"trial_ends_at" timestamp,
	"suspended_reason" text,
	"override_max_messages_month" integer,
	"notes" text,
	"owner_email" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "saas_tenant" ADD CONSTRAINT "saas_tenant_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "saas_tenant" ADD CONSTRAINT "saas_tenant_plan_id_saas_plan_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."saas_plan"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "saas_audit_org_idx" ON "saas_audit_log" USING btree ("organization_id","created_at");--> statement-breakpoint
CREATE INDEX "saas_tenant_status_idx" ON "saas_tenant" USING btree ("status");