import { Injectable } from '@nestjs/common';
import { ConditionConfig, ConditionGroup, ConditionRule, ConditionOperator, FieldType } from './interfaces/condition-config.interface';

@Injectable()
export class ConditionEvaluatorService {

  evaluate(config: ConditionConfig, instanceData: Record<string, any>): boolean {
    return this.evaluateGroup(config.rootGroup, instanceData);
  }

  private evaluateGroup(group: ConditionGroup, data: Record<string, any>): boolean {
    const ruleResults = group.rules.map(r => this.evaluateRule(r, data));
    const groupResults = (group.groups || []).map(g => this.evaluateGroup(g, data));
    const allResults = [...ruleResults, ...groupResults];

    return group.combinator === 'AND'
      ? allResults.every(Boolean)
      : allResults.some(Boolean);
  }

  private evaluateRule(rule: ConditionRule, data: Record<string, any>): boolean {
    const fieldValue = this.resolveFieldValue(rule.field, data);

    switch (rule.operator) {
      case ConditionOperator.EQ:      return fieldValue === rule.value;
      case ConditionOperator.NE:      return fieldValue !== rule.value;
      case ConditionOperator.GT:      return Number(fieldValue) > Number(rule.value);
      case ConditionOperator.GTE:     return Number(fieldValue) >= Number(rule.value);
      case ConditionOperator.LT:      return Number(fieldValue) < Number(rule.value);
      case ConditionOperator.LTE:     return Number(fieldValue) <= Number(rule.value);
      case ConditionOperator.BETWEEN:  return Number(fieldValue) >= Number(rule.value) && Number(fieldValue) <= Number(rule.valueEnd);
      case ConditionOperator.CONTAINS: return typeof fieldValue === 'string' && fieldValue.includes(String(rule.value));
      case ConditionOperator.IS_EMPTY:  return fieldValue === null || fieldValue === undefined || fieldValue === '';
      case ConditionOperator.IS_NOT_EMPTY: return fieldValue !== null && fieldValue !== undefined && fieldValue !== '';
      default: return false;
    }
  }

  private resolveFieldValue(field: string, data: Record<string, any>): any {
    return field.split('.').reduce((obj, key) => obj?.[key], data);
  }

  getOperatorsForFieldType(fieldType: FieldType): ConditionOperator[] {
    const map: Record<FieldType, ConditionOperator[]> = {
      [FieldType.TEXT]: [ConditionOperator.EQ, ConditionOperator.NE, ConditionOperator.CONTAINS, ConditionOperator.IS_EMPTY, ConditionOperator.IS_NOT_EMPTY],
      [FieldType.NUMBER]: [ConditionOperator.EQ, ConditionOperator.NE, ConditionOperator.GT, ConditionOperator.GTE, ConditionOperator.LT, ConditionOperator.LTE, ConditionOperator.BETWEEN, ConditionOperator.IS_EMPTY],
      [FieldType.DATE]: [ConditionOperator.EQ, ConditionOperator.NE, ConditionOperator.GT, ConditionOperator.LT, ConditionOperator.IS_EMPTY],
      [FieldType.YES_NO]: [ConditionOperator.EQ, ConditionOperator.NE],
      [FieldType.DROPDOWN]: [ConditionOperator.EQ, ConditionOperator.NE, ConditionOperator.IS_EMPTY],
      [FieldType.MULTISELECT]: [ConditionOperator.CONTAINS, ConditionOperator.IS_EMPTY],
    };
    return map[fieldType] || [];
  }
}