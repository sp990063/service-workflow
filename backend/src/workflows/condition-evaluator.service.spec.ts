import { ConditionEvaluatorService } from './condition-evaluator.service';
import { ConditionConfig, ConditionOperator, FieldType } from './interfaces/condition-config.interface';

describe('ConditionEvaluatorService', () => {
  let service: ConditionEvaluatorService;

  beforeEach(() => { service = new ConditionEvaluatorService(); });

  describe('evaluate', () => {
    it('should return true when number GT condition is met', () => {
      const config: ConditionConfig = {
        rootGroup: {
          id: 'g1', combinator: 'AND', rules: [{
            id: 'r1', field: 'formData.amount', fieldType: FieldType.NUMBER,
            fieldLabel: 'Amount', operator: ConditionOperator.GT, value: 1000
          }]
        }
      };
      expect(service.evaluate(config, { formData: { amount: 1500 } })).toBe(true);
      expect(service.evaluate(config, { formData: { amount: 500 } })).toBe(false);
    });

    it('should return true when dropdown EQ condition is met', () => {
      const config: ConditionConfig = {
        rootGroup: {
          id: 'g1', combinator: 'AND', rules: [{
            id: 'r1', field: 'formData.department', fieldType: FieldType.DROPDOWN,
            fieldLabel: 'Department', operator: ConditionOperator.EQ, value: 'IT'
          }]
        }
      };
      expect(service.evaluate(config, { formData: { department: 'IT' } })).toBe(true);
      expect(service.evaluate(config, { formData: { department: 'HR' } })).toBe(false);
    });

    it('should evaluate AND combinator correctly', () => {
      const config: ConditionConfig = {
        rootGroup: {
          id: 'g1', combinator: 'AND', rules: [
            { id: 'r1', field: 'formData.amount', fieldType: FieldType.NUMBER, fieldLabel: 'Amount', operator: ConditionOperator.GT, value: 1000 },
            { id: 'r2', field: 'formData.department', fieldType: FieldType.DROPDOWN, fieldLabel: 'Department', operator: ConditionOperator.EQ, value: 'IT' }
          ]
        }
      };
      expect(service.evaluate(config, { formData: { amount: 1500, department: 'IT' } })).toBe(true);
      expect(service.evaluate(config, { formData: { amount: 1500, department: 'HR' } })).toBe(false);
      expect(service.evaluate(config, { formData: { amount: 500, department: 'IT' } })).toBe(false);
    });

    it('should evaluate OR combinator correctly', () => {
      const config: ConditionConfig = {
        rootGroup: {
          id: 'g1', combinator: 'OR', rules: [
            { id: 'r1', field: 'formData.amount', fieldType: FieldType.NUMBER, fieldLabel: 'Amount', operator: ConditionOperator.GT, value: 10000 },
            { id: 'r2', field: 'formData.urgent', fieldType: FieldType.YES_NO, fieldLabel: 'Urgent', operator: ConditionOperator.EQ, value: true }
          ]
        }
      };
      expect(service.evaluate(config, { formData: { amount: 500, urgent: true } })).toBe(true);
      expect(service.evaluate(config, { formData: { amount: 500, urgent: false } })).toBe(false);
      expect(service.evaluate(config, { formData: { amount: 15000, urgent: false } })).toBe(true);
    });

    it('should handle BETWEEN operator', () => {
      const config: ConditionConfig = {
        rootGroup: {
          id: 'g1', combinator: 'AND', rules: [{
            id: 'r1', field: 'formData.amount', fieldType: FieldType.NUMBER,
            fieldLabel: 'Amount', operator: ConditionOperator.BETWEEN, value: 1000, valueEnd: 5000
          }]
        }
      };
      expect(service.evaluate(config, { formData: { amount: 3000 } })).toBe(true);
      expect(service.evaluate(config, { formData: { amount: 500 } })).toBe(false);
      expect(service.evaluate(config, { formData: { amount: 6000 } })).toBe(false);
    });

    it('should handle IS_EMPTY operator', () => {
      const config: ConditionConfig = {
        rootGroup: {
          id: 'g1', combinator: 'AND', rules: [{
            id: 'r1', field: 'formData.notes', fieldType: FieldType.TEXT,
            fieldLabel: 'Notes', operator: ConditionOperator.IS_EMPTY, value: null
          }]
        }
      };
      expect(service.evaluate(config, { formData: { notes: '' } })).toBe(true);
      expect(service.evaluate(config, { formData: { notes: null } })).toBe(true);
      expect(service.evaluate(config, { formData: { notes: 'some text' } })).toBe(false);
    });

    it('should resolve nested field paths', () => {
      const config: ConditionConfig = {
        rootGroup: {
          id: 'g1', combinator: 'AND', rules: [{
            id: 'r1', field: 'workflowData.priority', fieldType: FieldType.NUMBER,
            fieldLabel: 'Priority', operator: ConditionOperator.GT, value: 5
          }]
        }
      };
      expect(service.evaluate(config, { workflowData: { priority: 10 } })).toBe(true);
      expect(service.evaluate(config, { workflowData: { priority: 3 } })).toBe(false);
    });
  });

  describe('getOperatorsForFieldType', () => {
    it('should return correct operators for NUMBER type', () => {
      const ops = service.getOperatorsForFieldType(FieldType.NUMBER);
      expect(ops).toContain(ConditionOperator.GT);
      expect(ops).toContain(ConditionOperator.LT);
      expect(ops).toContain(ConditionOperator.BETWEEN);
    });

    it('should return correct operators for TEXT type', () => {
      const ops = service.getOperatorsForFieldType(FieldType.TEXT);
      expect(ops).toContain(ConditionOperator.CONTAINS);
      expect(ops).toContain(ConditionOperator.EQ);
    });

    it('should return empty array for unknown field type', () => {
      const ops = service.getOperatorsForFieldType('unknown' as FieldType);
      expect(ops).toEqual([]);
    });
  });
});