export enum ConditionOperator {
  EQ = 'eq',
  NE = 'ne',
  GT = 'gt',
  GTE = 'gte',
  LT = 'lt',
  LTE = 'lte',
  BETWEEN = 'between',
  CONTAINS = 'contains',
  IS_EMPTY = 'isEmpty',
  IS_NOT_EMPTY = 'isNotEmpty',
}

export enum FieldType {
  TEXT = 'text',
  NUMBER = 'number',
  DATE = 'date',
  YES_NO = 'yesNo',
  DROPDOWN = 'dropdown',
  MULTISELECT = 'multiselect',
}

export interface ConditionRule {
  id: string;
  field: string;       // e.g. "formData.amount"
  fieldType: FieldType;
  fieldLabel: string;  // e.g. "Amount"
  operator: ConditionOperator;
  value: any;
  valueEnd?: any;      // for BETWEEN
}

export interface ConditionGroup {
  id: string;
  combinator: 'AND' | 'OR';
  rules: ConditionRule[];
  groups?: ConditionGroup[];  // nested for complex logic
}

export interface ConditionConfig {
  rootGroup: ConditionGroup;
}