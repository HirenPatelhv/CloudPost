import React, { useState } from 'react';
import { 
  Database, 
  Layers, 
  Share2, 
  CheckCircle2, 
  Copy, 
  Check, 
  Server, 
  Lock, 
  Zap, 
  ArrowRight, 
  FileCode, 
  GitBranch, 
  Radio
} from 'lucide-react';

export const ArchitectureAndSchemaView: React.FC = () => {
  const [activeSubTab, setActiveSubTab] = useState<'architecture' | 'schema' | 'roadmap' | 'api_contracts'>('architecture');
  const [copiedSection, setCopiedSection] = useState<string | null>(null);

  const copyToClipboard = (text: string, sectionId: string) => {
    navigator.clipboard.writeText(text);
    setCopiedSection(sectionId);
    setTimeout(() => setCopiedSection(null), 2000);
  };

  const prismaSchema = `// =========================================================
// Prisma Schema: Collaborative API Development Platform
// Datasource: PostgreSQL | Client: @prisma/client
// =========================================================

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}

enum WorkspaceType {
  PERSONAL
  TEAM
}

enum Role {
  ADMIN
  EDITOR
  VIEWER
}

enum MemberStatus {
  ACTIVE
  PENDING
  DECLINED
}

enum HttpMethod {
  GET
  POST
  PUT
  DELETE
  PATCH
  OPTIONS
  HEAD
}

enum BodyType {
  NONE
  JSON
  FORM_DATA
  URL_ENCODED
  RAW
}

model User {
  id              String            @id @default(uuid())
  email           String            @unique
  name            String
  passwordHash    String?
  avatarUrl       String?
  createdAt       DateTime          @default(now())
  updatedAt       DateTime          @updatedAt
  
  // Relations
  ownedWorkspaces Workspace[]       @relation("WorkspaceOwner")
  memberships     WorkspaceMember[]
  activityLogs    ActivityLog[]
  createdRequests ApiRequest[]      @relation("RequestCreator")
  testRuns        TestRunResult[]
}

model Workspace {
  id          String            @id @default(uuid())
  name        String
  description String?
  type        WorkspaceType     @default(PERSONAL)
  ownerId     String
  owner       User              @relation("WorkspaceOwner", fields: [ownerId], references: [id], onDelete: Cascade)
  createdAt   DateTime          @default(now())
  updatedAt   DateTime          @updatedAt
  
  // Relations
  members      WorkspaceMember[]
  collections  Collection[]
  environments Environment[]
  activityLogs ActivityLog[]
  
  @@index([ownerId])
}

model WorkspaceMember {
  id          String        @id @default(uuid())
  workspaceId String
  userId      String
  role        Role          @default(EDITOR)
  status      MemberStatus  @default(PENDING)
  invitedAt   DateTime      @default(now())
  joinedAt    DateTime?
  
  workspace   Workspace     @relation(fields: [workspaceId], references: [id], onDelete: Cascade)
  user        User          @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  @@unique([workspaceId, userId])
  @@index([workspaceId])
  @@index([userId])
}

model Collection {
  id          String       @id @default(uuid())
  workspaceId String
  name        String
  description String?
  authConfig  Json?        // { type: "bearer" | "basic" | "apiKey", ... }
  createdAt   DateTime     @default(now())
  updatedAt   DateTime     @updatedAt
  
  workspace   Workspace    @relation(fields: [workspaceId], references: [id], onDelete: Cascade)
  folders     Folder[]
  requests    ApiRequest[]
  testRuns    TestRunResult[]

  @@index([workspaceId])
}

model Folder {
  id             String       @id @default(uuid())
  collectionId   String
  parentFolderId String?
  name           String
  description    String?
  createdAt      DateTime     @default(now())
  updatedAt      DateTime     @updatedAt
  
  collection     Collection   @relation(fields: [collectionId], references: [id], onDelete: Cascade)
  parentFolder   Folder?      @relation("FolderHierarchy", fields: [parentFolderId], references: [id], onDelete: Cascade)
  subFolders     Folder[]     @relation("FolderHierarchy")
  requests       ApiRequest[]
  
  @@index([collectionId])
  @@index([parentFolderId])
}

model ApiRequest {
  id                String       @id @default(uuid())
  collectionId      String
  folderId          String?
  createdById       String
  name              String
  description       String?
  method            HttpMethod   @default(GET)
  url               String
  params            Json         @default("[]") // [{ id, key, value, enabled, description }]
  headers           Json         @default("[]") // [{ id, key, value, enabled }]
  bodyType          BodyType     @default(NONE)
  bodyPayload       Json?        // Raw or Structured Body object
  authConfig        Json?        // Request-level Auth Override
  testsScript       String?      @db.Text
  preRequestScript  String?      @db.Text
  createdAt         DateTime     @default(now())
  updatedAt         DateTime     @updatedAt
  
  collection        Collection   @relation(fields: [collectionId], references: [id], onDelete: Cascade)
  folder            Folder?      @relation(fields: [folderId], references: [id], onDelete: SetNull)
  createdBy         User         @relation("RequestCreator", fields: [createdById], references: [id])
  
  @@index([collectionId])
  @@index([folderId])
}

model Environment {
  id          String                @id @default(uuid())
  workspaceId String?               // NULL = Global Environment
  name        String
  isGlobal    Boolean               @default(false)
  createdAt   DateTime              @default(now())
  updatedAt   DateTime              @updatedAt
  
  workspace   Workspace?            @relation(fields: [workspaceId], references: [id], onDelete: Cascade)
  variables   EnvironmentVariable[]
  
  @@index([workspaceId])
}

model EnvironmentVariable {
  id            String      @id @default(uuid())
  environmentId String
  key           String
  value         String
  initialValue  String?
  enabled       Boolean     @default(true)
  isSecret      Boolean     @default(false)
  description   String?
  
  environment   Environment @relation(fields: [environmentId], references: [id], onDelete: Cascade)
  
  @@index([environmentId])
  @@unique([environmentId, key])
}

model ActivityLog {
  id          String    @id @default(uuid())
  workspaceId String
  userId      String
  action      String    // CREATED_REQUEST, UPDATED_REQUEST, INVITED_MEMBER, etc.
  targetType  String    // request, collection, member, environment
  targetName  String
  details     String?
  timestamp   DateTime  @default(now())
  
  workspace   Workspace @relation(fields: [workspaceId], references: [id], onDelete: Cascade)
  user        User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  @@index([workspaceId])
  @@index([timestamp])
}

model TestRunResult {
  id           String     @id @default(uuid())
  collectionId String
  userId       String
  totalPassed  Int
  totalFailed  Int
  durationMs   Int
  reportData   Json       // Array of per-request response times & assertions
  executedAt   DateTime   @default(now())
  
  collection   Collection @relation(fields: [collectionId], references: [id], onDelete: Cascade)
  user         User       @relation(fields: [userId], references: [id])
  
  @@index([collectionId])
}`;

  const postgresDDL = `-- =========================================================
-- PostgreSQL DDL: Collaborative API Platform
-- =========================================================

CREATE TYPE workspace_type AS ENUM ('PERSONAL', 'TEAM');
CREATE TYPE user_role AS ENUM ('ADMIN', 'EDITOR', 'VIEWER');
CREATE TYPE member_status AS ENUM ('ACTIVE', 'PENDING', 'DECLINED');
CREATE TYPE http_method AS ENUM ('GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS', 'HEAD');
CREATE TYPE body_type AS ENUM ('NONE', 'JSON', 'FORM_DATA', 'URL_ENCODED', 'RAW');

-- 1. Users Table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(150) NOT NULL,
    password_hash VARCHAR(255),
    avatar_url TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 2. Workspaces Table
CREATE TABLE workspaces (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(150) NOT NULL,
    description TEXT,
    type workspace_type DEFAULT 'PERSONAL',
    owner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 3. Workspace Members (RBAC Junction)
CREATE TABLE workspace_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role user_role DEFAULT 'EDITOR',
    status member_status DEFAULT 'PENDING',
    invited_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    joined_at TIMESTAMPTZ,
    CONSTRAINT uq_workspace_user UNIQUE (workspace_id, user_id)
);

-- 4. Collections Table
CREATE TABLE collections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    name VARCHAR(200) NOT NULL,
    description TEXT,
    auth_config JSONB,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 5. Folders Hierarchy
CREATE TABLE folders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    collection_id UUID NOT NULL REFERENCES collections(id) ON DELETE CASCADE,
    parent_folder_id UUID REFERENCES folders(id) ON DELETE CASCADE,
    name VARCHAR(150) NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 6. API Requests
CREATE TABLE api_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    collection_id UUID NOT NULL REFERENCES collections(id) ON DELETE CASCADE,
    folder_id UUID REFERENCES folders(id) ON DELETE SET NULL,
    created_by_id UUID NOT NULL REFERENCES users(id),
    name VARCHAR(200) NOT NULL,
    description TEXT,
    method http_method DEFAULT 'GET',
    url TEXT NOT NULL,
    params JSONB DEFAULT '[]'::jsonb,
    headers JSONB DEFAULT '[]'::jsonb,
    body_type body_type DEFAULT 'NONE',
    body_payload JSONB,
    auth_config JSONB,
    tests_script TEXT,
    pre_request_script TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 7. Environments and Variables
CREATE TABLE environments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    is_global BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE environment_variables (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    environment_id UUID NOT NULL REFERENCES environments(id) ON DELETE CASCADE,
    key VARCHAR(150) NOT NULL,
    value TEXT NOT NULL,
    initial_value TEXT,
    enabled BOOLEAN DEFAULT true,
    is_secret BOOLEAN DEFAULT false,
    description TEXT,
    CONSTRAINT uq_env_key UNIQUE (environment_id, key)
);

-- Indexes for lightning fast lookups
CREATE INDEX idx_workspaces_owner ON workspaces(owner_id);
CREATE INDEX idx_workspace_members_user ON workspace_members(user_id);
CREATE INDEX idx_collections_workspace ON collections(workspace_id);
CREATE INDEX idx_requests_collection ON api_requests(collection_id);
CREATE INDEX idx_requests_folder ON api_requests(folder_id);`;

  return (
    <div id="architecture_view_container" className="h-full flex flex-col bg-[#0b0d13] text-[#e1e4ea] overflow-y-auto">
      {/* Header */}
      <div className="p-6 border-b border-white/10 bg-[#121622]/80 backdrop-blur sticky top-0 z-20">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-orange-400 mb-1">
              <Layers className="w-4 h-4" />
              <span>Full-Stack System Architecture & Database Blueprint</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-white">
              Collaborative Postman Platform Engineering Blueprint
            </h1>
            <p className="text-xs text-zinc-400 mt-1">
              Complete technical specification for Workspaces, RBAC permissions, real-time collaboration, and PostgreSQL/Prisma models.
            </p>
          </div>

          {/* Sub Navigation Tabs */}
          <div className="flex items-center gap-1 bg-[#1a1f2e] p-1 rounded-lg border border-white/10 text-xs">
            <button
              onClick={() => setActiveSubTab('architecture')}
              className={`px-3 py-1.5 rounded-md font-medium transition-all ${
                activeSubTab === 'architecture'
                  ? 'bg-orange-500 text-white shadow-sm'
                  : 'text-zinc-400 hover:text-white hover:bg-white/5'
              }`}
            >
              System Architecture
            </button>
            <button
              onClick={() => setActiveSubTab('schema')}
              className={`px-3 py-1.5 rounded-md font-medium transition-all ${
                activeSubTab === 'schema'
                  ? 'bg-orange-500 text-white shadow-sm'
                  : 'text-zinc-400 hover:text-white hover:bg-white/5'
              }`}
            >
              Database Schema (Prisma/SQL)
            </button>
            <button
              onClick={() => setActiveSubTab('roadmap')}
              className={`px-3 py-1.5 rounded-md font-medium transition-all ${
                activeSubTab === 'roadmap'
                  ? 'bg-orange-500 text-white shadow-sm'
                  : 'text-zinc-400 hover:text-white hover:bg-white/5'
              }`}
            >
              Workspaces & RBAC Roadmap
            </button>
            <button
              onClick={() => setActiveSubTab('api_contracts')}
              className={`px-3 py-1.5 rounded-md font-medium transition-all ${
                activeSubTab === 'api_contracts'
                  ? 'bg-orange-500 text-white shadow-sm'
                  : 'text-zinc-400 hover:text-white hover:bg-white/5'
              }`}
            >
              REST API Contracts
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="max-w-6xl mx-auto p-6 w-full space-y-8">
        {activeSubTab === 'architecture' && (
          <div className="space-y-8 animate-in fade-in duration-200">
            {/* Architectural Overview Card */}
            <div className="bg-[#141824] border border-white/10 rounded-xl p-6 shadow-xl">
              <h2 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
                <Server className="w-5 h-5 text-orange-400" />
                High-Level System Topology
              </h2>
              <p className="text-sm text-zinc-300 leading-relaxed mb-6">
                The platform is designed with a modern decoupled full-stack architecture. Client instances communicate with a Node.js/Express API Gateway for workspace data management, authorization checks, and real-time WebSocket syncing for presence and live multi-user editing.
              </p>

              {/* Topology Grid */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs">
                <div className="bg-[#1a2030] p-4 rounded-lg border border-white/10 flex flex-col justify-between">
                  <div>
                    <div className="w-8 h-8 rounded-lg bg-orange-500/20 text-orange-400 flex items-center justify-center font-bold mb-3">
                      1
                    </div>
                    <h3 className="font-semibold text-white text-sm mb-1">React SPA Client</h3>
                    <p className="text-zinc-400 leading-relaxed">
                      Interactive UI with Monaco/JSON editors, dynamic URL interpolation, request tabs, and collection treeviews.
                    </p>
                  </div>
                  <div className="mt-4 pt-3 border-t border-white/5 text-[11px] text-orange-300 font-mono">
                    React 19 + Tailwind
                  </div>
                </div>

                <div className="bg-[#1a2030] p-4 rounded-lg border border-white/10 flex flex-col justify-between">
                  <div>
                    <div className="w-8 h-8 rounded-lg bg-blue-500/20 text-blue-400 flex items-center justify-center font-bold mb-3">
                      2
                    </div>
                    <h3 className="font-semibold text-white text-sm mb-1">API & Proxy Gateway</h3>
                    <p className="text-zinc-400 leading-relaxed">
                      Express proxy dispatching HTTP requests to eliminate browser CORS barriers and enforce RBAC policies.
                    </p>
                  </div>
                  <div className="mt-4 pt-3 border-t border-white/5 text-[11px] text-blue-300 font-mono">
                    Node.js + Express
                  </div>
                </div>

                <div className="bg-[#1a2030] p-4 rounded-lg border border-white/10 flex flex-col justify-between">
                  <div>
                    <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold mb-3">
                      3
                    </div>
                    <h3 className="font-semibold text-white text-sm mb-1">Real-Time Sync Engine</h3>
                    <p className="text-zinc-400 leading-relaxed">
                      WebSocket / Server-Sent Events channel broadcasting active member presence, lock states, and shared edits.
                    </p>
                  </div>
                  <div className="mt-4 pt-3 border-t border-white/5 text-[11px] text-emerald-300 font-mono">
                    WebSocket + Redis PubSub
                  </div>
                </div>

                <div className="bg-[#1a2030] p-4 rounded-lg border border-white/10 flex flex-col justify-between">
                  <div>
                    <div className="w-8 h-8 rounded-lg bg-purple-500/20 text-purple-400 flex items-center justify-center font-bold mb-3">
                      4
                    </div>
                    <h3 className="font-semibold text-white text-sm mb-1">Relational Database</h3>
                    <p className="text-zinc-400 leading-relaxed">
                      PostgreSQL with Prisma ORM storing relational trees: Workspaces → Members → Collections → Folders → Requests.
                    </p>
                  </div>
                  <div className="mt-4 pt-3 border-t border-white/5 text-[11px] text-purple-300 font-mono">
                    PostgreSQL + Prisma
                  </div>
                </div>
              </div>
            </div>

            {/* Visual Data Flow Diagram */}
            <div className="bg-[#141824] border border-white/10 rounded-xl p-6 shadow-xl">
              <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <GitBranch className="w-5 h-5 text-blue-400" />
                Collaborative Request Dispatch & Variable Pipeline
              </h2>

              <div className="space-y-3 font-mono text-xs">
                <div className="p-4 rounded-lg bg-[#0e111a] border border-white/10 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="px-2 py-0.5 bg-orange-500/20 text-orange-400 rounded text-[10px] font-bold">STAGE 1</span>
                    <span className="text-white font-semibold">User Input & Scope Resolution</span>
                  </div>
                  <span className="text-zinc-400 text-[11px]">Extracts <code className="text-orange-300">{"{{baseUrl}}"}</code> & checks Global + Env variables</span>
                </div>

                <div className="flex justify-center text-zinc-500">
                  <ArrowRight className="w-4 h-4 rotate-90" />
                </div>

                <div className="p-4 rounded-lg bg-[#0e111a] border border-white/10 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="px-2 py-0.5 bg-blue-500/20 text-blue-400 rounded text-[10px] font-bold">STAGE 2</span>
                    <span className="text-white font-semibold">RBAC Authorization Gate</span>
                  </div>
                  <span className="text-zinc-400 text-[11px]">Validates User Role (Admin / Editor / Viewer)</span>
                </div>

                <div className="flex justify-center text-zinc-500">
                  <ArrowRight className="w-4 h-4 rotate-90" />
                </div>

                <div className="p-4 rounded-lg bg-[#0e111a] border border-white/10 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-400 rounded text-[10px] font-bold">STAGE 3</span>
                    <span className="text-white font-semibold">Proxy Dispatch & Real-Time Test Suite</span>
                  </div>
                  <span className="text-zinc-400 text-[11px]">Executes target HTTP request, computes latency & runs <code className="text-emerald-300">pm.test()</code> sandbox</span>
                </div>

                <div className="flex justify-center text-zinc-500">
                  <ArrowRight className="w-4 h-4 rotate-90" />
                </div>

                <div className="p-4 rounded-lg bg-[#0e111a] border border-white/10 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="px-2 py-0.5 bg-purple-500/20 text-purple-400 rounded text-[10px] font-bold">STAGE 4</span>
                    <span className="text-white font-semibold">Activity Stream Broadcast</span>
                  </div>
                  <span className="text-zinc-400 text-[11px]">Broadcasts audit trail & results to all active workspace collaborators</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeSubTab === 'schema' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            {/* Prisma Schema Block */}
            <div className="bg-[#141824] border border-white/10 rounded-xl overflow-hidden shadow-xl">
              <div className="px-6 py-4 border-b border-white/10 bg-[#181d2c] flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Database className="w-4 h-4 text-emerald-400" />
                  <span className="font-semibold text-sm text-white">Prisma Schema Definition (schema.prisma)</span>
                </div>
                <button
                  onClick={() => copyToClipboard(prismaSchema, 'prisma')}
                  className="flex items-center gap-1.5 px-3 py-1 bg-white/5 hover:bg-white/10 rounded text-xs text-zinc-300 transition-colors"
                >
                  {copiedSection === 'prisma' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedSection === 'prisma' ? 'Copied' : 'Copy Prisma Schema'}</span>
                </button>
              </div>
              <pre className="p-6 text-xs text-zinc-300 font-mono bg-[#0c0e15] overflow-x-auto max-h-[480px]">
                {prismaSchema}
              </pre>
            </div>

            {/* PostgreSQL DDL Block */}
            <div className="bg-[#141824] border border-white/10 rounded-xl overflow-hidden shadow-xl">
              <div className="px-6 py-4 border-b border-white/10 bg-[#181d2c] flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileCode className="w-4 h-4 text-blue-400" />
                  <span className="font-semibold text-sm text-white">PostgreSQL Raw DDL Script (init_schema.sql)</span>
                </div>
                <button
                  onClick={() => copyToClipboard(postgresDDL, 'sql')}
                  className="flex items-center gap-1.5 px-3 py-1 bg-white/5 hover:bg-white/10 rounded text-xs text-zinc-300 transition-colors"
                >
                  {copiedSection === 'sql' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedSection === 'sql' ? 'Copied' : 'Copy PostgreSQL DDL'}</span>
                </button>
              </div>
              <pre className="p-6 text-xs text-zinc-300 font-mono bg-[#0c0e15] overflow-x-auto max-h-[400px]">
                {postgresDDL}
              </pre>
            </div>
          </div>
        )}

        {activeSubTab === 'roadmap' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <div className="bg-[#141824] border border-white/10 rounded-xl p-6 shadow-xl">
              <h2 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
                <Lock className="w-5 h-5 text-orange-400" />
                Step-by-Step Plan: Workspaces & Collaboration Engine
              </h2>
              <p className="text-xs text-zinc-400 mb-6">
                Execution roadmap prioritizing isolated multi-tenant environments, email invitation flows, and strict Role-Based Access Control (RBAC).
              </p>

              <div className="space-y-6">
                {/* Phase 1 */}
                <div className="border-l-2 border-orange-500 pl-4 space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded bg-orange-500/20 text-orange-400 text-xs font-bold font-mono">PHASE 1</span>
                    <h3 className="text-sm font-semibold text-white">Workspace Isolation & Multi-Tenancy</h3>
                  </div>
                  <p className="text-xs text-zinc-300 leading-relaxed">
                    1. Implement database partitioning where all Collections, Environments, and Requests are foreign-keyed to a <code className="text-orange-300">workspace_id</code>.
                    <br />
                    2. Enforce workspace session cookies and JWT payload claims so requests cannot leak across isolated teams.
                    <br />
                    3. Support auto-creation of a default <strong>Personal Workspace</strong> upon user onboarding.
                  </p>
                </div>

                {/* Phase 2 */}
                <div className="border-l-2 border-blue-500 pl-4 space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded bg-blue-500/20 text-blue-400 text-xs font-bold font-mono">PHASE 2</span>
                    <h3 className="text-sm font-semibold text-white">Email Invitations & Member Onboarding</h3>
                  </div>
                  <p className="text-xs text-zinc-300 leading-relaxed">
                    1. Admin triggers invite via <code className="text-blue-300">POST /api/workspaces/:id/invitations</code> with email and requested role.
                    <br />
                    2. Generate cryptographically secure invite tokens with 7-day expiration.
                    <br />
                    3. Send transactional invite emails with single-click magic join links.
                  </p>
                </div>

                {/* Phase 3 */}
                <div className="border-l-2 border-emerald-500 pl-4 space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 text-xs font-bold font-mono">PHASE 3</span>
                    <h3 className="text-sm font-semibold text-white">Granular Role-Based Access Control (RBAC)</h3>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2 text-xs">
                    <div className="bg-[#1a2030] p-3 rounded border border-white/5">
                      <div className="font-bold text-red-400 mb-1 flex items-center gap-1">
                        <Lock className="w-3.5 h-3.5" /> ADMIN
                      </div>
                      <p className="text-zinc-400 text-[11px]">Full control. Can delete workspace, manage billing, modify member roles, and invite users.</p>
                    </div>
                    <div className="bg-[#1a2030] p-3 rounded border border-white/5">
                      <div className="font-bold text-blue-400 mb-1 flex items-center gap-1">
                        <Zap className="w-3.5 h-3.5" /> EDITOR
                      </div>
                      <p className="text-zinc-400 text-[11px]">Create, edit, and organize collections, folders, requests, and environment variables.</p>
                    </div>
                    <div className="bg-[#1a2030] p-3 rounded border border-white/5">
                      <div className="font-bold text-emerald-400 mb-1 flex items-center gap-1">
                        <Radio className="w-3.5 h-3.5" /> VIEWER
                      </div>
                      <p className="text-zinc-400 text-[11px]">Read-only access. Can execute requests and run test suites, but cannot modify saved configs.</p>
                    </div>
                  </div>
                </div>

                {/* Phase 4 */}
                <div className="border-l-2 border-purple-500 pl-4 space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded bg-purple-500/20 text-purple-400 text-xs font-bold font-mono">PHASE 4</span>
                    <h3 className="text-sm font-semibold text-white">Real-Time Presence & Live Conflict Resolution</h3>
                  </div>
                  <p className="text-xs text-zinc-300 leading-relaxed">
                    1. WebSocket presence room per workspace broadcasting <code className="text-purple-300">USER_JOINED</code>, <code className="text-purple-300">USER_EDITING_REQUEST</code>, and <code className="text-purple-300">USER_LEFT</code>.
                    <br />
                    2. Optimistic locking with operational transform / last-write-wins with audit warnings.
                    <br />
                    3. Live activity logging tracking all critical operations across the entire engineering team.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeSubTab === 'api_contracts' && (
          <div className="space-y-4 animate-in fade-in duration-200 text-xs">
            <div className="bg-[#141824] border border-white/10 rounded-xl p-6 shadow-xl">
              <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <Share2 className="w-5 h-5 text-orange-400" />
                Backend REST API Endpoints Specification
              </h2>

              <div className="space-y-3 font-mono">
                <div className="p-3 bg-[#0f121b] rounded border border-white/10 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-400 font-bold rounded">GET</span>
                    <span className="text-white font-semibold">/api/v1/workspaces</span>
                  </div>
                  <span className="text-zinc-400 text-[11px]">List all workspaces current user has membership in</span>
                </div>

                <div className="p-3 bg-[#0f121b] rounded border border-white/10 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="px-2 py-0.5 bg-amber-500/20 text-amber-400 font-bold rounded">POST</span>
                    <span className="text-white font-semibold">/api/v1/workspaces</span>
                  </div>
                  <span className="text-zinc-400 text-[11px]">Create new Team or Personal workspace</span>
                </div>

                <div className="p-3 bg-[#0f121b] rounded border border-white/10 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="px-2 py-0.5 bg-amber-500/20 text-amber-400 font-bold rounded">POST</span>
                    <span className="text-white font-semibold">/api/v1/workspaces/:id/members/invite</span>
                  </div>
                  <span className="text-zinc-400 text-[11px]">Invite teammate by email with role (Admin only)</span>
                </div>

                <div className="p-3 bg-[#0f121b] rounded border border-white/10 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="px-2 py-0.5 bg-purple-500/20 text-purple-400 font-bold rounded">PATCH</span>
                    <span className="text-white font-semibold">/api/v1/workspaces/:id/members/:userId/role</span>
                  </div>
                  <span className="text-zinc-400 text-[11px]">Update member role to Admin, Editor, or Viewer</span>
                </div>

                <div className="p-3 bg-[#0f121b] rounded border border-white/10 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="px-2 py-0.5 bg-red-500/20 text-red-400 font-bold rounded">DELETE</span>
                    <span className="text-white font-semibold">/api/v1/workspaces/:id/members/:userId</span>
                  </div>
                  <span className="text-zinc-400 text-[11px]">Revoke member workspace access</span>
                </div>

                <div className="p-3 bg-[#0f121b] rounded border border-white/10 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="px-2 py-0.5 bg-amber-500/20 text-amber-400 font-bold rounded">POST</span>
                    <span className="text-white font-semibold">/api/v1/proxy/dispatch</span>
                  </div>
                  <span className="text-zinc-400 text-[11px]">Server-side proxy execution engine bypassing CORS</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
