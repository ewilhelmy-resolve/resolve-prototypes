export interface ConnectionSource {
  id: string;
  title: string;
  status: Status;
  lastSync?: string;
  description?: string;
  badges: string[];
  config?: {
    url?: string;
    email?: string;
    token?: string;
    spaces?: string[];
    tenantId?: string;
    clientId?: string;
    clientSecret?: string;
    siteUrl?: string;
    instanceUrl?: string;
    username?: string;
    password?: string;
    updatedAt?: string;
  };
 }

 export type Status = 'Not connected' | 'Connected' | 'Syncing' | 'Error';

 export const STATUS = {
  NOT_CONNECTED: 'Not connected' as Status,
  CONNECTED: 'Connected' as Status,
  SYNCING: 'Syncing' as Status,
  ERROR: 'Error' as Status,
};


export const SOURCE_IDS = ['confluence', 'sharepoint', 'servicenow', 'web-search'] as const;

export const SOURCES = {
  CONFLUENCE: SOURCE_IDS[0],
  SHAREPOINT: SOURCE_IDS[1],
  SERVICENOW: SOURCE_IDS[2],
  WEB_SEARCH: SOURCE_IDS[3],
} as const;

export const CONNECTION_SOURCES: ConnectionSource[] = [
  {
    id: SOURCES.CONFLUENCE,
    title: 'Confluence',
    status: STATUS.CONNECTED,
    lastSync: '—',
    badges: ['Knowledge'],
    config: {
      url: 'http://acme.atlassian.net/wiki',
      email: 'charlie@acme.com',
      spaces: ['architecture', 'knowledge', 'engineering'],
      updatedAt: '2:09 PM, Today',
    },
   },
  {
    id: SOURCES.SHAREPOINT,
    title: 'SharePoint',
    status: STATUS.SYNCING,
    lastSync: '—',
    badges: ['Knowledge'],
    config: {
      url: 'http://acme.atlassian.net/wiki',
      email: 'charlie@acme.com',
      updatedAt: '2:09 PM, Today',
    },
   },
  {
    id: SOURCES.SERVICENOW,
    title: 'ServiceNow',
    status: STATUS.ERROR,
    lastSync: '—',
    badges: ['Knowledge', 'Ticketing'],
    config: {
      url: 'http://acme.atlassian.net/wiki',
      email: 'charlie@acme.com',
      updatedAt: '2:09 PM, Today',
    },
  },
  {
    id: SOURCES.WEB_SEARCH,
    title: 'Web Search (LGA)',
    status: STATUS.CONNECTED,
    description: 'Use web results to supplement answers when knowledge isn\'t found.',
    badges: ['Knowledge'],
   }
];

 
export type SourceId = typeof SOURCES[keyof typeof SOURCES];

// Helper function to get source by ID
export const getSourceById = (id: string): ConnectionSource | undefined => {
  return CONNECTION_SOURCES.find(source => source.id === id);
};
