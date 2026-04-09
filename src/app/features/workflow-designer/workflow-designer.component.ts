import { Component, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { WorkflowService } from '../../core/services/workflow.service';
import { FormService } from '../../core/services/form.service';
import { Workflow, WorkflowNode, WorkflowConnection, Form } from '../../core/models';

const NODE_TYPES = [
  { type: 'start', label: 'Start', icon: '▶', color: '#10b981' },
  { type: 'end', label: 'End', icon: '■', color: '#ef4444' },
  { type: 'task', label: 'Task', icon: '⬡', color: '#6366f1' },
  { type: 'condition', label: 'Condition', icon: '◇', color: '#f59e0b' },
  { type: 'approval', label: 'Approval', icon: '✓', color: '#8b5cf6' },
  { type: 'parallel', label: 'Parallel', icon: '∥', color: '#06b6d4' },
  { type: 'join', label: 'Join', icon: '⊥', color: '#06b6d4' },
  { type: 'sub-workflow', label: 'Sub-Workflow', icon: '⊂', color: '#ec4899' },
  { type: 'script', label: 'Script', icon: '⚙', color: '#f97316' },
  { type: 'setvalue', label: 'Set Value', icon: '✎', color: '#22c55e' },
  { type: 'transform', label: 'Transform', icon: '⇄', color: '#a855f7' }
];

@Component({
  selector: 'app-workflow-designer',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="workflow-designer">
      <div class="designer-header">
        <div class="header-left">
          <input 
            type="text" 
            [(ngModel)]="workflowName" 
            placeholder="Untitled Workflow"
            class="workflow-name-input"
          >
        </div>
        <div class="header-actions">
          <button class="btn btn-secondary" (click)="clearWorkflow()">Clear</button>
          <button class="btn btn-secondary" (click)="addStartNode()">+ Start</button>
          <button class="btn btn-primary" (click)="saveWorkflow()">Save Workflow</button>
        </div>
      </div>
      
      <div class="designer-body">
        <aside class="node-panel">
          <h3>Nodes</h3>
          <div class="node-list">
            @for (nodeType of nodeTypes; track nodeType.type) {
              <div 
                class="node-item" 
                draggable="true"
                (dragstart)="onDragStart($event, nodeType)"
              >
                <span class="node-icon" [style.background]="nodeType.color">
                  {{ nodeType.icon }}
                </span>
                <span class="node-label">{{ nodeType.label }}</span>
              </div>
            }
          </div>
        </aside>
        
        <main 
          class="canvas-container"
          (dragover)="onDragOver($event)"
          (drop)="onDrop($event)"
          (click)="deselectAll()"
        >
          <svg class="connections-layer">
            @for (conn of connections(); track conn.id) {
              <line 
                [attr.x1]="getNodeCenter(conn.source).x"
                [attr.y1]="getNodeCenter(conn.source).y"
                [attr.x2]="getNodeCenter(conn.target).x"
                [attr.y2]="getNodeCenter(conn.target).y"
                class="connection-line"
              />
            }
          </svg>
          
          @if (nodes().length === 0) {
            <div class="empty-canvas">
              <p>Drag nodes here to create your workflow</p>
              <p class="hint">Start with a Start node</p>
            </div>
          } @else {
            <div class="nodes-container">
              @for (node of nodes(); track node.id) {
                <div 
                  class="workflow-node"
                  [class.selected]="selectedNodeId() === node.id"
                  [style.left.px]="node.position.x"
                  [style.top.px]="node.position.y"
                  (click)="selectNode(node.id, $event)"
                  (mousedown)="startDrag($event, node)"
                >
                  <div class="node-header" [style.background]="getNodeColor(node.type)">
                    {{ getNodeLabel(node.type) }}
                  </div>
                  <div class="node-body">
                    {{ node.data['label'] || node.type }}
                  </div>
                  <div class="node-handles">
                    <div class="handle handle-in"></div>
                    <div class="handle handle-out" (mousedown)="startConnection($event, node)"></div>
                  </div>
                </div>
              }
            </div>
          }
        </main>
        
        <aside class="properties">
          <h3>Properties</h3>
          @if (selectedNode()) {
            <div class="property-form">
              <div class="form-group">
                <label>Node Type</label>
                <input type="text" [value]="selectedNode()!.type" disabled>
              </div>
              <div class="form-group">
                <label>Label</label>
                <input 
                  type="text" 
                  [ngModel]="selectedNode()!.data['label']"
                  (ngModelChange)="updateNodeLabel($event)"
                  placeholder="Enter label"
                >
              </div>
              @if (selectedNode()!.type === 'task' || selectedNode()!.type === 'approval') {
                <div class="form-group">
                  <label>Description</label>
                  <textarea 
                    [ngModel]="selectedNode()!.data['description']"
                    (ngModelChange)="updateNodeData('description', $event)"
                    rows="3"
                  ></textarea>
                </div>
                <div class="form-group">
                  <label>Linked Form</label>
                  <select 
                    [ngModel]="selectedNode()!.data['formId']"
                    (ngModelChange)="updateNodeData('formId', $event)"
                  >
                    <option value="">-- No form --</option>
                    @for (form of forms(); track form.id) {
                      <option [value]="form.id">{{ form.name }}</option>
                    }
                  </select>
                </div>
              }
              @if (selectedNode()!.type === 'condition') {
                <div class="form-group">
                  <label>Field</label>
                  <input 
                    type="text" 
                    [ngModel]="selectedNode()!.data['field']"
                    (ngModelChange)="updateNodeData('field', $event)"
                  >
                </div>
                <div class="form-group">
                  <label>Value</label>
                  <input 
                    type="text" 
                    [ngModel]="selectedNode()!.data['value']"
                    (ngModelChange)="updateNodeData('value', $event)"
                  >
                </div>
              }
              @if (selectedNode()!.type === 'sub-workflow') {
                <div class="form-group">
                  <label>Description</label>
                  <textarea 
                    [ngModel]="selectedNode()!.data['description']"
                    (ngModelChange)="updateNodeData('description', $event)"
                    rows="3"
                  ></textarea>
                </div>
                <div class="form-group">
                  <label>Child Workflow</label>
                  <select 
                    [ngModel]="selectedNode()!.data['childWorkflowId']"
                    (ngModelChange)="updateNodeData('childWorkflowId', $event)"
                  >
                    <option value="">Select workflow...</option>
                    @for (wf of workflows(); track wf.id) {
                      <option [value]="wf.id">{{ wf.name }}</option>
                    }
                  </select>
                </div>
                <div class="form-group checkbox">
                  <label>
                    <input 
                      type="checkbox" 
                      [ngModel]="selectedNode()!.data['waitForCompletion']"
                      (ngModelChange)="updateNodeData('waitForCompletion', $event)"
                    >
                    <span>Wait for completion</span>
                  </label>
                </div>
              }
              @if (selectedNode()!.type === 'script') {
                <div class="form-group">
                  <label>Expression</label>
                  <textarea 
                    [ngModel]="selectedNode()!.data['expression']"
                    (ngModelChange)="updateNodeData('expression', $event)"
                    rows="4"
                    placeholder="e.g., formData.amount > 1000 ? 'high' : 'low'"
                  ></textarea>
                </div>
                <div class="form-group">
                  <label>Output Field</label>
                  <input 
                    type="text" 
                    [ngModel]="selectedNode()!.data['outputField']"
                    (ngModelChange)="updateNodeData('outputField', $event)"
                    placeholder="e.g., _scriptResult"
                  >
                </div>
              }
              @if (selectedNode()!.type === 'setvalue') {
                <div class="form-group">
                  <label>Field Name</label>
                  <input 
                    type="text" 
                    [ngModel]="selectedNode()!.data['field']"
                    (ngModelChange)="updateNodeData('field', $event)"
                    placeholder="e.g., status"
                  >
                </div>
                <div class="form-group">
                  <label>Value</label>
                  <input 
                    type="text" 
                    [ngModel]="selectedNode()!.data['value']"
                    (ngModelChange)="updateNodeData('value', $event)"
                    placeholder="e.g., approved or currentUser.name"
                  >
                </div>
              }
              @if (selectedNode()!.type === 'transform') {
                <div class="form-group">
                  <label>Output Field</label>
                  <input 
                    type="text" 
                    [ngModel]="selectedNode()!.data['outputField']"
                    (ngModelChange)="updateNodeData('outputField', $event)"
                    placeholder="e.g., fullName"
                  >
                </div>
                <div class="form-group">
                  <label>Expression</label>
                  <textarea 
                    [ngModel]="selectedNode()!.data['expression']"
                    (ngModelChange)="updateNodeData('expression', $event)"
                    rows="3"
                    placeholder="e.g., firstName + ' ' + lastName"
                  ></textarea>
                </div>
              }
              <button class="btn btn-danger" (click)="deleteNode()">Delete Node</button>
            </div>
          } @else {
            <p class="no-selection">Select a node to edit</p>
          }
          
          @if (connectingFrom()) {
            <div class="connection-hint">
              Click on another node to connect
            </div>
          }
        </aside>
      </div>
    </div>
  `,
  styles: [`
    .workflow-designer {
      display: flex;
      flex-direction: column;
      height: calc(100vh - 4rem);
    }
    .designer-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding-bottom: 1rem;
      border-bottom: 1px solid var(--color-border);
      margin-bottom: 1rem;
    }
    .workflow-name-input {
      font-size: 1.25rem;
      font-weight: 600;
      border: none;
      background: transparent;
      width: 300px;
    }
    .workflow-name-input:focus {
      outline: none;
      border-bottom: 2px solid var(--color-primary);
    }
    .header-actions {
      display: flex;
      gap: 0.5rem;
    }
    .designer-body {
      display: flex;
      flex: 1;
      gap: 1rem;
      overflow: hidden;
    }
    .node-panel {
      width: 180px;
      background: var(--color-surface);
      border-radius: var(--radius-lg);
      padding: 1rem;
    }
    .node-panel h3, .properties h3 {
      font-size: 0.875rem;
      font-weight: 600;
      color: var(--color-text-muted);
      text-transform: uppercase;
      margin-bottom: 1rem;
    }
    .node-list {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }
    .node-item {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 0.5rem;
      border-radius: var(--radius-md);
      cursor: grab;
      transition: background var(--transition-fast);
    }
    .node-item:hover {
      background: var(--color-background);
    }
    .node-icon {
      width: 32px;
      height: 32px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: var(--radius-md);
      color: white;
      font-size: 0.875rem;
    }
    .node-label {
      font-size: 0.875rem;
      font-weight: 500;
    }
    .canvas-container {
      flex: 1;
      background: var(--color-surface);
      border-radius: var(--radius-lg);
      position: relative;
      overflow: hidden;
      background-image: radial-gradient(circle, var(--color-border) 1px, transparent 1px);
      background-size: 20px 20px;
    }
    .connections-layer {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      pointer-events: none;
    }
    .connection-line {
      stroke: var(--color-secondary);
      stroke-width: 2;
    }
    .empty-canvas {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      text-align: center;
      color: var(--color-text-muted);
    }
    .empty-canvas .hint {
      font-size: 0.875rem;
      margin-top: 0.5rem;
    }
    .nodes-container {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
    }
    .workflow-node {
      position: absolute;
      width: 140px;
      background: var(--color-surface);
      border: 2px solid var(--color-border);
      border-radius: var(--radius-md);
      cursor: move;
      user-select: none;
    }
    .workflow-node.selected {
      border-color: var(--color-primary);
      box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.2);
    }
    .node-header {
      padding: 0.5rem;
      color: white;
      font-size: 0.75rem;
      font-weight: 600;
      text-align: center;
      border-radius: var(--radius-sm) var(--radius-sm) 0 0;
    }
    .node-body {
      padding: 0.75rem;
      text-align: center;
      font-size: 0.875rem;
    }
    .node-handles {
      position: absolute;
      top: 50%;
      width: 100%;
    }
    .handle {
      position: absolute;
      width: 12px;
      height: 12px;
      background: var(--color-secondary);
      border-radius: 50%;
      cursor: crosshair;
    }
    .handle-in {
      left: -6px;
      top: -6px;
    }
    .handle-out {
      right: -6px;
      top: -6px;
    }
    .properties {
      width: 260px;
      background: var(--color-surface);
      border-radius: var(--radius-lg);
      padding: 1rem;
    }
    .property-form {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }
    .form-group label {
      display: block;
      font-size: 0.75rem;
      font-weight: 500;
      margin-bottom: 0.25rem;
    }
    .btn-danger {
      background: var(--color-danger);
      color: white;
      border: none;
      padding: 0.5rem 1rem;
      border-radius: var(--radius-md);
      cursor: pointer;
    }
    .no-selection {
      color: var(--color-text-muted);
      font-size: 0.875rem;
      text-align: center;
      padding: 2rem 1rem;
    }
    .connection-hint {
      margin-top: 1rem;
      padding: 0.75rem;
      background: var(--color-primary);
      color: white;
      border-radius: var(--radius-md);
      font-size: 0.875rem;
      text-align: center;
    }
  `]
})
export class WorkflowDesignerComponent {
  nodeTypes = NODE_TYPES;
  workflowName = 'Untitled Workflow';
  nodes = signal<WorkflowNode[]>([]);
  connections = signal<WorkflowConnection[]>([]);
  selectedNodeId = signal<string | null>(null);
  connectingFrom = signal<string | null>(null);
  workflows = signal<Workflow[]>([]);  // Available workflows for sub-workflow selection
  forms = signal<Form[]>([]);  // Available forms for task/approval nodes
  
  private dragNode: WorkflowNode | null = null;
  private dragOffset = { x: 0, y: 0 };
  
  selectedNode = computed(() => {
    const id = this.selectedNodeId();
    return id ? this.nodes().find(n => n.id === id) || null : null;
  });
  
  constructor(
    private workflowService: WorkflowService,
    private formService: FormService
  ) {
    // Load existing workflows for sub-workflow selection
    this.workflowService.getAll().subscribe({
      next: (workflows) => this.workflows.set(workflows),
      error: () => {}
    });
    // Load existing forms for task/approval node binding
    this.formService.getAll().subscribe({
      next: (forms) => this.forms.set(forms),
      error: () => {}
    });
  }
  
  getNodeColor(type: string): string {
    return this.nodeTypes.find(n => n.type === type)?.color || '#64748b';
  }
  
  getNodeLabel(type: string): string {
    return this.nodeTypes.find(n => n.type === type)?.label || type;
  }
  
  getNodeCenter(nodeId: string): { x: number; y: number } {
    const node = this.nodes().find(n => n.id === nodeId);
    if (!node) return { x: 0, y: 0 };
    return {
      x: node.position.x + 70,
      y: node.position.y + 40
    };
  }
  
  onDragStart(event: DragEvent, nodeType: typeof NODE_TYPES[0]) {
    event.dataTransfer?.setData('nodeType', JSON.stringify(nodeType));
  }
  
  onDragOver(event: DragEvent) {
    event.preventDefault();
  }
  
  onDrop(event: DragEvent) {
    event.preventDefault();
    const data = event.dataTransfer?.getData('nodeType');
    if (data) {
      const nodeType = JSON.parse(data);
      const rect = (event.target as HTMLElement).getBoundingClientRect();
      const newNode: WorkflowNode = {
        id: crypto.randomUUID(),
        type: nodeType.type as WorkflowNode['type'],
        position: {
          x: event.clientX - rect.left - 70,
          y: event.clientY - rect.top - 40
        },
        data: { label: nodeType.label }
      };
      this.nodes.update(ns => [...ns, newNode]);
    }
  }
  
  selectNode(id: string, event: Event) {
    event.stopPropagation();
    if (this.connectingFrom()) {
      this.createConnection(this.connectingFrom()!, id);
      this.connectingFrom.set(null);
    } else {
      this.selectedNodeId.set(id);
    }
  }
  
  deselectAll() {
    if (!this.connectingFrom()) {
      this.selectedNodeId.set(null);
    }
  }
  
  startDrag(event: MouseEvent, node: WorkflowNode) {
    if ((event.target as HTMLElement).classList.contains('handle-out')) return;
    this.dragNode = node;
    this.dragOffset = {
      x: event.clientX - node.position.x,
      y: event.clientY - node.position.y
    };
    this.selectedNodeId.set(node.id);
    
    const onMouseMove = (e: MouseEvent) => {
      if (this.dragNode) {
        this.dragNode.position = {
          x: e.clientX - this.dragOffset.x,
          y: e.clientY - this.dragOffset.y
        };
        this.nodes.update(ns => [...ns]);
      }
    };
    
    const onMouseUp = () => {
      this.dragNode = null;
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };
    
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  }
  
  startConnection(event: MouseEvent, node: WorkflowNode) {
    event.stopPropagation();
    this.connectingFrom.set(node.id);
  }
  
  createConnection(sourceId: string, targetId: string) {
    if (sourceId === targetId) return;
    const exists = this.connections().some(
      c => c.source === sourceId && c.target === targetId
    );
    if (!exists) {
      this.connections.update(cs => [...cs, {
        id: crypto.randomUUID(),
        source: sourceId,
        target: targetId
      }]);
    }
  }
  
  updateNodeLabel(value: string) {
    const node = this.selectedNode();
    if (node) {
      node.data['label'] = value;
      this.nodes.update(ns => [...ns]);
    }
  }
  
  updateNodeData(key: string, value: string) {
    const node = this.selectedNode();
    if (node) {
      node.data[key] = value;
      this.nodes.update(ns => [...ns]);
    }
  }
  
  deleteNode() {
    const id = this.selectedNodeId();
    if (id) {
      this.nodes.update(ns => ns.filter(n => n.id !== id));
      this.connections.update(cs => cs.filter(c => c.source !== id && c.target !== id));
      this.selectedNodeId.set(null);
    }
  }
  
  addStartNode() {
    const startNode: WorkflowNode = {
      id: crypto.randomUUID(),
      type: 'start',
      position: { x: 100, y: 100 },
      data: { label: 'Start' }
    };
    this.nodes.update(ns => [...ns, startNode]);
  }
  
  clearWorkflow() {
    this.nodes.set([]);
    this.connections.set([]);
    this.selectedNodeId.set(null);
    this.workflowName = 'Untitled Workflow';
  }
  
  saveWorkflow() {
    this.workflowService.create({
      name: this.workflowName,
      nodes: this.nodes(),
      connections: this.connections()
    }).subscribe({
      next: () => {
        alert('Workflow saved!');
      },
      error: () => {
        alert('Failed to save workflow.');
      }
    });
  }
}
