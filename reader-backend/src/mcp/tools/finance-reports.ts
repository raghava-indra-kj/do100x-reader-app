import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { type Actor, type FinanceDb } from '../../finance/context';
import { ruleSchema, uuid } from '../../finance/contract';
import { exportFinance, exportSchema, listRules, report, reportSchema, setRule, suggestions } from '../../finance/report-service';
import { financeTool, registerFinanceTool as register } from './finance-tool';

export function registerFinanceReportTools(server: McpServer, actor: Actor, db: FinanceDb) {
  register(server, 'finance_report', 'Get recorded posted income/spending/refunds, liquid cash flow, balances, hierarchical category budgets, merchant/payment-method breakdown, comparison and coverage/data-quality warnings. Transfers and corrections never count as earnings/spending. Transaction dates classify expenses; movement dates classify account cash flow.', { bookId: uuid, range: reportSchema }, ({ bookId, range }) => financeTool(() => report(db, actor.userId, bookId, range)));
  register(server, 'finance_get_suggestions', 'Get reviewed-only discretionary range and recurrence candidates from six complete months, with source transaction IDs and missing-history warnings. Zero-spend months are included. This never creates plans, rules or estimates automatically.', { bookId: uuid }, ({ bookId }) => financeTool(() => suggestions(db, actor.userId, bookId)));
  register(server, 'finance_list_rules', 'Read explicit substring categorization/merchant rules. No arbitrary regex or executable code. Multiple matching rules are not guessed.', { bookId: uuid }, ({ bookId }) => financeTool(() => listRules(db, actor.userId, bookId)));
  register(server, 'finance_set_rule', 'Create/update a user-reviewed import rule. Supply a fresh stable UUID id and expectedVersion 0 for creation, then the current version for edits. enabled=false preserves disabled rules. Rule effects are pinned at statement staging, not changed silently at commit.', { bookId: uuid, rule: ruleSchema }, ({ bookId, rule }) => financeTool(() => setRule(db, actor, bookId, rule)));
  register(server, 'finance_export', 'Export a complete JSON book snapshot including deleted history/provenance, or a filtered CSV register with exact decimal money and spreadsheet-safe text. JSON does not accept date filters. Export is read-only; no bank credentials are included.', { bookId: uuid, export: exportSchema }, ({ bookId, export: input }) => financeTool(() => exportFinance(db, actor.userId, bookId, input)));
}
