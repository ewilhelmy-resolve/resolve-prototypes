/**
 * Data Source Constants
 * Defines allowed data source types for application-level validation
 */

export const ALLOWED_DATA_SOURCE_TYPES = [
  'confluence',
  'servicenow',
  'sharepoint',
  'websearch',
  'jira'
] as const;

export type DataSourceType = typeof ALLOWED_DATA_SOURCE_TYPES[number];

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
    type: 'confluence' as DataSourceType,
    name: 'Confluence',
    description: 'Connect your Atlassian Confluence workspace'
  },
  {
    type: 'servicenow' as DataSourceType,
    name: 'ServiceNow',
    description: 'Connect your ServiceNow instance'
  },
  {
    type: 'sharepoint' as DataSourceType,
    name: 'SharePoint',
    description: 'Connect your Microsoft SharePoint'
  },
  {
    type: 'websearch' as DataSourceType,
    name: 'Web Search',
    description: 'Search the public web'
  },
  {
    type: 'jira' as DataSourceType,
    name: 'Jira',
    description: 'Connect your Atlassian Jira instance'
  }
] as const;