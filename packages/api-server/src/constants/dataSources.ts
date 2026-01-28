/**
 * Data Source Constants
 * Defines allowed data source types for application-level validation
 */

export const ALLOWED_DATA_SOURCE_TYPES = [
	"confluence",
	"servicenow",
	"servicenow_itsm",
	"sharepoint",
	"websearch",
	"jira_itsm",
	"freshdesk",
] as const;

export type DataSourceType = (typeof ALLOWED_DATA_SOURCE_TYPES)[number];

/**
 * Type guard to validate data source types
 */
export function isValidDataSourceType(type: string): type is DataSourceType {
	return ALLOWED_DATA_SOURCE_TYPES.includes(type as DataSourceType);
}

/**
 * Default data sources to seed for new organizations
 */
export const DEFAULT_DATA_SOURCES = [
	{
		type: "confluence" as DataSourceType,
		name: "Confluence",
		description: "Connect your Atlassian Confluence workspace",
	},
	{
		type: "servicenow" as DataSourceType,
		name: "ServiceNow Knowledge",
		description: "Connect your ServiceNow knowledge base",
	},
	{
		type: "servicenow_itsm" as DataSourceType,
		name: "ServiceNow ITSM",
		description: "Import tickets from ServiceNow for Autopilot",
	},
	{
		type: "sharepoint" as DataSourceType,
		name: "SharePoint",
		description: "Connect your Microsoft SharePoint",
	},
	{
		type: "websearch" as DataSourceType,
		name: "Web Search",
		description: "Search the public web",
	},
	{
		type: "jira_itsm" as DataSourceType,
		name: "Jira",
		description: "Import tickets from Jira for Autopilot clustering",
	},
	{
		type: "freshdesk" as DataSourceType,
		name: "Freshdesk",
		description: "Import tickets from Freshdesk for Autopilot clustering",
	},
] as const;
