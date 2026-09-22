import { Environment, Variable, Collection } from '../types';

export type VariableScope = 'environment' | 'global' | 'collection' | 'dynamic';

export interface ScopedVariable extends Variable {
  scope: VariableScope;
  scopeName: string;
}

export interface DynamicVariableDef {
  key: string;
  description: string;
  category: string;
  generator: () => string;
}

export const DYNAMIC_VARIABLES: DynamicVariableDef[] = [
  {
    key: '$guid',
    description: 'A randomly generated v4 UUID',
    category: 'Identifiers',
    generator: () => 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    }),
  },
  {
    key: '$randomUUID',
    description: 'A randomly generated v4 UUID (alias of $guid)',
    category: 'Identifiers',
    generator: () => 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    }),
  },
  {
    key: '$timestamp',
    description: 'Current Unix timestamp in seconds',
    category: 'Date & Time',
    generator: () => Math.floor(Date.now() / 1000).toString(),
  },
  {
    key: '$isoTimestamp',
    description: 'Current ISO-8601 UTC timestamp',
    category: 'Date & Time',
    generator: () => new Date().toISOString(),
  },
  {
    key: '$randomInt',
    description: 'A random integer between 1 and 1000',
    category: 'Numbers',
    generator: () => Math.floor(Math.random() * 1000 + 1).toString(),
  },
  {
    key: '$randomEmail',
    description: 'A random simulated email address',
    category: 'User & Profile',
    generator: () => {
      const names = ['alex', 'jordan', 'sam', 'taylor', 'morgan', 'chris', 'casey', 'riley'];
      const domains = ['example.com', 'postman-test.io', 'cloudpost.dev', 'api-sandbox.net'];
      const name = names[Math.floor(Math.random() * names.length)];
      const rand = Math.floor(Math.random() * 900 + 100);
      const domain = domains[Math.floor(Math.random() * domains.length)];
      return `${name}${rand}@${domain}`;
    },
  },
  {
    key: '$randomUserName',
    description: 'A random username handle',
    category: 'User & Profile',
    generator: () => {
      const prefixes = ['dev', 'coder', 'ninja', 'cloud', 'stack', 'cyber', 'pixel', 'alpha'];
      const suffixes = ['hunter', 'master', 'guru', 'builder', 'pilot', 'runner', 'forge'];
      const p = prefixes[Math.floor(Math.random() * prefixes.length)];
      const s = suffixes[Math.floor(Math.random() * suffixes.length)];
      const num = Math.floor(Math.random() * 99 + 1);
      return `${p}_${s}_${num}`;
    },
  },
  {
    key: '$randomFullName',
    description: 'A random full name',
    category: 'User & Profile',
    generator: () => {
      const first = ['Sarah', 'Alex', 'David', 'Elena', 'Marcus', 'Priya', 'Liam', 'Zoe'];
      const last = ['Chen', 'Smith', 'Vance', 'Patel', 'Kowalski', 'Dubois', 'Kim', 'Taylor'];
      return `${first[Math.floor(Math.random() * first.length)]} ${last[Math.floor(Math.random() * last.length)]}`;
    },
  },
  {
    key: '$randomFirstName',
    description: 'A random first name',
    category: 'User & Profile',
    generator: () => {
      const first = ['Sarah', 'Alex', 'David', 'Elena', 'Marcus', 'Priya', 'Liam', 'Zoe'];
      return first[Math.floor(Math.random() * first.length)];
    },
  },
  {
    key: '$randomLastName',
    description: 'A random last name',
    category: 'User & Profile',
    generator: () => {
      const last = ['Chen', 'Smith', 'Vance', 'Patel', 'Kowalski', 'Dubois', 'Kim', 'Taylor'];
      return last[Math.floor(Math.random() * last.length)];
    },
  },
  {
    key: '$randomPhoneNumber',
    description: 'A random formatted phone number',
    category: 'Contact',
    generator: () => `+1-${Math.floor(Math.random() * 800 + 200)}-555-01${Math.floor(Math.random() * 90 + 10)}`,
  },
  {
    key: '$randomCity',
    description: 'A random major city name',
    category: 'Location',
    generator: () => {
      const cities = ['San Francisco', 'New York', 'London', 'Tokyo', 'Berlin', 'Toronto', 'Sydney', 'Singapore', 'Amsterdam'];
      return cities[Math.floor(Math.random() * cities.length)];
    },
  },
  {
    key: '$randomCountry',
    description: 'A random country name',
    category: 'Location',
    generator: () => {
      const countries = ['United States', 'United Kingdom', 'Germany', 'Japan', 'Canada', 'Australia', 'Netherlands', 'France'];
      return countries[Math.floor(Math.random() * countries.length)];
    },
  },
  {
    key: '$randomPrice',
    description: 'A random price amount (e.g. 49.99)',
    category: 'Commerce',
    generator: () => (Math.random() * 200 + 5).toFixed(2),
  },
  {
    key: '$randomBoolean',
    description: 'A random boolean (true or false)',
    category: 'Misc',
    generator: () => (Math.random() > 0.5 ? 'true' : 'false'),
  },
  {
    key: '$randomAlphaNumeric',
    description: 'A random 10-character alphanumeric string',
    category: 'Text',
    generator: () => Math.random().toString(36).substring(2, 12),
  },
  {
    key: '$randomColor',
    description: 'A random hex color code',
    category: 'Misc',
    generator: () => `#${Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0')}`,
  },
];

/**
 * Resolves all variables in scope (combines global, collection, and active environment variables).
 */
export function getActiveVariables(
  environments: Environment[], 
  activeEnvId?: string,
  collection?: Collection
): ScopedVariable[] {
  const variableMap = new Map<string, ScopedVariable>();

  // 1. Global variables (Base layer)
  const globalEnv = environments.find(e => e.isGlobal);
  if (globalEnv) {
    for (const v of globalEnv.variables) {
      if (v.enabled && v.key.trim()) {
        variableMap.set(v.key.trim(), {
          ...v,
          scope: 'global',
          scopeName: 'Globals',
        });
      }
    }
  }

  // 2. Collection variables (Middle layer)
  if (collection && collection.variables) {
    for (const v of collection.variables) {
      if (v.enabled && v.key.trim()) {
        variableMap.set(v.key.trim(), {
          ...v,
          scope: 'collection',
          scopeName: collection.name,
        });
      }
    }
  }

  // 3. Active environment variables (Top layer - highest precedence)
  if (activeEnvId && activeEnvId !== 'no_env') {
    const activeEnv = environments.find(e => e.id === activeEnvId);
    if (activeEnv) {
      for (const v of activeEnv.variables) {
        if (v.enabled && v.key.trim()) {
          variableMap.set(v.key.trim(), {
            ...v,
            scope: 'environment',
            scopeName: activeEnv.name,
          });
        }
      }
    }
  }

  return Array.from(variableMap.values());
}

export const getScopedVariables = getActiveVariables;

/**
 * Returns all available variables including dynamic $ variables for autocomplete and suggestion.
 */
export function getAllAvailableVariablesForAutocomplete(
  scopedVariables: ScopedVariable[]
): { key: string; value: string; scope: VariableScope; scopeName: string; description?: string; isSecret?: boolean }[] {
  const list: { key: string; value: string; scope: VariableScope; scopeName: string; description?: string; isSecret?: boolean }[] = [];

  // Scoped variables first
  for (const sv of scopedVariables) {
    list.push({
      key: sv.key,
      value: sv.value,
      scope: sv.scope,
      scopeName: sv.scopeName,
      description: sv.description,
      isSecret: sv.isSecret,
    });
  }

  // Dynamic variables next
  for (const dyn of DYNAMIC_VARIABLES) {
    list.push({
      key: dyn.key,
      value: dyn.generator(),
      scope: 'dynamic',
      scopeName: 'Dynamic ($)',
      description: dyn.description,
    });
  }

  return list;
}

/**
 * Replaces `{{variableName}}` with its actual value, evaluating dynamic $ variables on demand.
 */
export function interpolateString(
  template: string,
  variables: Variable[]
): { resolved: string; missingVars: string[] } {
  if (!template) return { resolved: '', missingVars: [] };

  const varMap = new Map<string, string>();
  for (const v of variables) {
    if (v.enabled) {
      varMap.set(v.key.trim(), v.value);
    }
  }

  const dynMap = new Map<string, () => string>();
  for (const d of DYNAMIC_VARIABLES) {
    dynMap.set(d.key, d.generator);
  }

  const missingVars: string[] = [];
  const resolved = template.replace(/\{\{\s*([$a-zA-Z0-9_-]+)\s*\}\}/g, (match, varName) => {
    // 1. Check user variables
    if (varMap.has(varName)) {
      return varMap.get(varName) ?? '';
    }
    // 2. Check dynamic Postman variables ($guid, $timestamp, etc.)
    if (dynMap.has(varName)) {
      const gen = dynMap.get(varName);
      return gen ? gen() : match;
    }
    // 3. Unresolved variable
    if (!missingVars.includes(varName)) {
      missingVars.push(varName);
    }
    return match; // keep unresolved indicator
  });

  return { resolved, missingVars };
}

/**
 * Extract all `{{varName}}` tokens from a string.
 */
export function extractVariableTokens(text: string): string[] {
  if (!text) return [];
  const tokens: string[] = [];
  const regex = /\{\{\s*([$a-zA-Z0-9_-]+)\s*\}\}/g;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(text)) !== null) {
    if (!tokens.includes(match[1])) {
      tokens.push(match[1]);
    }
  }
  return tokens;
}
