import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

// ============ Permissions Definition ============
// Follows OpenProject-style modular permissions

const PERMISSIONS = [
  // Admin module
  { name: 'admin.users.read', description: 'View users', module: 'admin' },
  { name: 'admin.users.write', description: 'Manage users', module: 'admin' },
  { name: 'admin.roles.read', description: 'View roles', module: 'admin' },
  { name: 'admin.roles.write', description: 'Manage roles', module: 'admin' },

  // Forms module
  { name: 'forms.read', description: 'View forms', module: 'forms' },
  { name: 'forms.create', description: 'Create forms', module: 'forms' },
  { name: 'forms.edit', description: 'Edit own forms', module: 'forms' },
  { name: 'forms.edit_any', description: 'Edit any form', module: 'forms' },
  { name: 'forms.delete', description: 'Delete own forms', module: 'forms' },
  { name: 'forms.delete_any', description: 'Delete any form', module: 'forms' },

  // Workflows module
  { name: 'workflows.read', description: 'View workflows', module: 'workflows' },
  { name: 'workflows.create', description: 'Create workflows', module: 'workflows' },
  { name: 'workflows.edit', description: 'Edit own workflows', module: 'workflows' },
  { name: 'workflows.edit_any', description: 'Edit any workflow', module: 'workflows' },
  { name: 'workflows.delete', description: 'Delete own workflows', module: 'workflows' },
  { name: 'workflows.delete_any', description: 'Delete any workflow', module: 'workflows' },
  { name: 'workflows.execute', description: 'Execute workflows', module: 'workflows' },

  // Submissions module
  { name: 'submissions.read', description: 'View own submissions', module: 'submissions' },
  { name: 'submissions.read_any', description: 'View any submission', module: 'submissions' },
  { name: 'submissions.create', description: 'Create submissions', module: 'submissions' },
  { name: 'submissions.edit', description: 'Edit own submissions', module: 'submissions' },
  { name: 'submissions.delete', description: 'Delete own submissions', module: 'submissions' },

  // Approvals module
  { name: 'approvals.read', description: 'View approvals', module: 'approvals' },
  { name: 'approvals.approve', description: 'Approve/reject', module: 'approvals' },
  { name: 'approvals.assign', description: 'Assign approvers', module: 'approvals' },
];

// ============ Role Definitions ============
// Follows OpenProject-style: Global, Project, Entity scopes

const ROLES = [
  {
    name: 'Admin',
    description: 'System administrator with full access',
    type: 'GLOBAL',
    permissions: PERMISSIONS.map(p => p.name), // Admin gets ALL permissions
  },
  {
    name: 'Manager',
    description: 'Department manager with workflow and approval permissions',
    type: 'PROJECT',
    permissions: [
      'forms.read', 'forms.create', 'forms.edit', 'forms.delete',
      'workflows.read', 'workflows.create', 'workflows.edit', 'workflows.execute',
      'submissions.read', 'submissions.read_any',
      'approvals.read', 'approvals.approve', 'approvals.assign',
    ],
  },
  {
    name: 'User',
    description: 'Regular employee with basic permissions',
    type: 'PROJECT',
    permissions: [
      'forms.read', 'forms.create', 'forms.edit', 'forms.delete',
      'workflows.read', 'workflows.create', 'workflows.execute',
      'submissions.read', 'submissions.create', 'submissions.edit',
      'approvals.read', 'approvals.approve',
    ],
  },
  {
    name: 'Viewer',
    description: 'Read-only access',
    type: 'PROJECT',
    permissions: [
      'forms.read', 'workflows.read', 'submissions.read', 'approvals.read',
    ],
  },
];

async function main() {
  console.log('🌱 Starting seed with OpenProject-style RBAC...');

  // Clean existing data (in correct order due to foreign keys)
  await prisma.rolePermission.deleteMany();
  await prisma.member.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.approvalRequest.deleteMany();
  await prisma.workflowInstance.deleteMany();
  await prisma.formSubmission.deleteMany();
  await prisma.workflow.deleteMany();
  await prisma.form.deleteMany();
  await prisma.permission.deleteMany();
  await prisma.role.deleteMany();
  await prisma.user.deleteMany();

  // ============ Create Permissions ============
  console.log('📝 Creating permissions...');
  await prisma.permission.createMany({ data: PERMISSIONS });
  console.log(`✅ Created ${PERMISSIONS.length} permissions`);

  // ============ Create Roles ============
  console.log('👥 Creating roles...');
  for (const roleDef of ROLES) {
    const { permissions, ...roleData } = roleDef;
    const role = await prisma.role.create({ data: roleData });

    // Find permission records
    const perms = await prisma.permission.findMany({
      where: { name: { in: permissions } },
    });

    // Create role-permission mappings
    await prisma.rolePermission.createMany({
      data: perms.map(p => ({ roleId: role.id, permissionId: p.id })),
    });

    console.log(`✅ Created role: ${role.name} with ${perms.length} permissions`);
  }

  // ============ Create Users ============
  console.log('👤 Creating users...');
  const hashedPassword = await bcrypt.hash('password123', 10);

  const admin = await prisma.user.create({
    data: {
      email: 'admin@example.com',
      password: hashedPassword,
      name: 'Admin User',
      role: 'ADMIN',
    },
  });

  const manager = await prisma.user.create({
    data: {
      email: 'manager@example.com',
      password: hashedPassword,
      name: 'Manager User',
      role: 'MANAGER',
    },
  });

  const employee = await prisma.user.create({
    data: {
      email: 'employee@example.com',
      password: hashedPassword,
      name: 'Employee User',
      role: 'USER',
    },
  });

  // Assign global Admin role to admin user
  const adminRole = await prisma.role.findUnique({ where: { name: 'Admin' } });
  if (adminRole) {
    await prisma.member.create({
      data: {
        userId: admin.id,
        roleId: adminRole.id,
        scopeType: 'GLOBAL',
      },
    });
  }

  // Assign Manager role to manager user
  const managerRole = await prisma.role.findUnique({ where: { name: 'Manager' } });
  if (managerRole) {
    await prisma.member.create({
      data: {
        userId: manager.id,
        roleId: managerRole.id,
        scopeType: 'GLOBAL',
      },
    });
  }

  // Create Director user
  const director = await prisma.user.create({
    data: {
      email: 'director@example.com',
      password: hashedPassword,
      name: 'Director User',
      role: 'MANAGER',
    },
  });

  // Assign Manager role to director user
  if (managerRole) {
    await prisma.member.create({
      data: {
        userId: director.id,
        roleId: managerRole.id,
        scopeType: 'GLOBAL',
      },
    });
  }

  console.log(`✅ Created users: admin@example.com, manager@example.com, employee@example.com, director@example.com`);

  // ============ Create Sample Form ============
  const sampleForm = await prisma.form.create({
    data: {
      name: 'IT Equipment Request',
      description: 'Request form for IT equipment',
      elements: JSON.stringify([
        { id: 'Employee Name', type: 'text', label: 'Employee Name', placeholder: 'Enter your name', required: true },
        { id: 'Email', type: 'email', label: 'Email', placeholder: 'your@email.com', required: true },
        { id: 'Equipment Type', type: 'dropdown', label: 'Equipment Type', options: ['Laptop', 'Monitor', 'Keyboard', 'Mouse', 'Headset'], required: true },
        { id: 'Justification', type: 'textarea', label: 'Justification', placeholder: 'Why do you need this equipment?', required: true },
      ]),
      isActive: true,
      userId: admin.id,
    },
  });
  console.log(`✅ Created form: ${sampleForm.name}`);

  // ============ Create Sample Workflow ============
  const sampleWorkflow = await prisma.workflow.create({
    data: {
      name: 'IT Equipment Approval',
      description: 'Workflow for IT equipment requests',
      category: 'IT',
      nodes: JSON.stringify([
        { id: 'node-start', type: 'start', position: { x: 100, y: 200 }, data: { label: 'Start', description: 'Start of workflow' } },
        { id: 'node-form', type: 'form', position: { x: 300, y: 200 }, data: { label: 'Fill Request Form', formId: sampleForm.id } },
        { id: 'node-review', type: 'task', position: { x: 500, y: 200 }, data: { label: 'Manager Review', assigneeRole: 'MANAGER' } },
        { id: 'node-end', type: 'end', position: { x: 700, y: 200 }, data: { label: 'End', description: 'End of workflow' } },
      ]),
      connections: JSON.stringify([
        { from: 'node-start', to: 'node-form' },
        { from: 'node-form', to: 'node-review' },
        { from: 'node-review', to: 'node-end' },
      ]),
      isActive: true,
      userId: admin.id,
    },
  });
  console.log(`✅ Created workflow: ${sampleWorkflow.name}`);

  // ============ Create More Sample Data ============
  // Feedback Form
  const feedbackForm = await prisma.form.create({
    data: {
      name: 'Customer Feedback',
      description: 'Capture customer feedback',
      elements: JSON.stringify([
        { id: 'fb-1', type: 'text', label: 'Customer Name', required: true },
        { id: 'fb-2', type: 'rating', label: 'Rating', maxRating: 5, required: true },
        { id: 'fb-3', type: 'textarea', label: 'Comments', placeholder: 'Share your feedback...' },
      ]),
      isActive: true,
      userId: admin.id,
    },
  });

  // Feedback Workflow
  await prisma.workflow.create({
    data: {
      name: 'Customer Feedback Workflow',
      description: 'Process customer feedback submissions',
      category: 'Customer Service',
      nodes: JSON.stringify([
        { id: 'fb-start', type: 'start', position: { x: 100, y: 200 }, data: { label: 'Start' } },
        { id: 'fb-form', type: 'form', position: { x: 300, y: 200 }, data: { label: 'Submit Feedback', formId: feedbackForm.id } },
        { id: 'fb-review', type: 'task', position: { x: 500, y: 200 }, data: { label: 'Review Feedback', assigneeRole: 'MANAGER' } },
        { id: 'fb-end', type: 'end', position: { x: 700, y: 200 }, data: { label: 'End' } },
      ]),
      connections: JSON.stringify([
        { from: 'fb-start', to: 'fb-form' },
        { from: 'fb-form', to: 'fb-review' },
        { from: 'fb-review', to: 'fb-end' },
      ]),
      isActive: true,
      userId: admin.id,
    },
  });

  // SDLC Workflow
  await prisma.workflow.create({
    data: {
      name: 'SDLC Process',
      description: 'Software Development Life Cycle - Requirements to Deployment',
      category: 'IT',
      nodes: JSON.stringify([
        { id: 'sdlc-start', type: 'start', position: { x: 50, y: 200 }, data: { label: 'Start', description: 'SDLC begins' } },
        { id: 'sdlc-req', type: 'task', position: { x: 200, y: 200 }, data: { label: 'Requirements', assigneeRole: 'BA' } },
        { id: 'sdlc-design', type: 'task', position: { x: 350, y: 200 }, data: { label: 'Design', assigneeRole: 'DEVELOPER' } },
        { id: 'sdlc-dev', type: 'task', position: { x: 500, y: 200 }, data: { label: 'Development', assigneeRole: 'DEVELOPER' } },
        { id: 'sdlc-test', type: 'task', position: { x: 650, y: 200 }, data: { label: 'QA Testing', assigneeRole: 'QA' } },
        { id: 'sdlc-deploy', type: 'task', position: { x: 800, y: 200 }, data: { label: 'Deploy', assigneeRole: 'OPS' } },
        { id: 'sdlc-end', type: 'end', position: { x: 950, y: 200 }, data: { label: 'End' } },
      ]),
      connections: JSON.stringify([
        { from: 'sdlc-start', to: 'sdlc-req' },
        { from: 'sdlc-req', to: 'sdlc-design' },
        { from: 'sdlc-design', to: 'sdlc-dev' },
        { from: 'sdlc-dev', to: 'sdlc-test' },
        { from: 'sdlc-test', to: 'sdlc-deploy' },
        { from: 'sdlc-deploy', to: 'sdlc-end' },
      ]),
      isActive: true,
      userId: admin.id,
    },
  });

  // Leave Request Form
  const leaveRequestForm = await prisma.form.create({
    data: {
      name: 'Leave Request',
      description: 'Request form for employee leave',
      elements: JSON.stringify([
        { id: 'lr-1', type: 'text', label: 'Employee Name', placeholder: 'Enter your name', required: true },
        { id: 'lr-2', type: 'date', label: 'Start Date', required: true },
        { id: 'lr-3', type: 'date', label: 'End Date', required: true },
        { id: 'lr-4', type: 'number', label: 'Number of Days', placeholder: 'Enter number of days', required: true, validation: { min: 1, max: 30 } },
        { id: 'lr-5', type: 'select', label: 'Leave Type', options: ['Annual', 'Sick', 'Personal', 'Other'], required: true },
        { id: 'lr-6', type: 'textarea', label: 'Reason', placeholder: 'Reason for leave', required: true },
      ]),
      isActive: true,
      userId: admin.id,
    },
  });
  console.log(`✅ Created form: ${leaveRequestForm.name}`);

  // Leave Request Workflow with Parallel Approval
  // Structure: start → form → condition(days > 3) → parallel(Manager,Director) → end
  //                                    ↓ false
  //                              approval(Manager) → end
  const leaveRequestWorkflow = await prisma.workflow.create({
    data: {
      name: 'Leave Request',
      description: 'Employee leave request workflow with conditional parallel approval',
      category: 'HR',
      nodes: JSON.stringify([
        { id: 'lr-start', type: 'start', position: { x: 100, y: 200 }, data: { label: 'Start', description: 'Start of leave request' } },
        { id: 'lr-form', type: 'form', position: { x: 250, y: 200 }, data: { label: 'Leave Request Form', formId: leaveRequestForm.id } },
        { id: 'lr-condition', type: 'condition', position: { x: 400, y: 200 }, data: { label: 'Check Days', field: 'lr-4', operator: 'greater_than', value: '3', trueBranch: 'lr-parallel', falseBranch: 'lr-manager' } },
        { id: 'lr-manager', type: 'approval', position: { x: 400, y: 350 }, data: { label: 'Manager Approval', approverRole: 'MANAGER' } },
        { id: 'lr-parallel', type: 'parallel', position: { x: 550, y: 200 }, data: { label: 'Parallel Approval (Manager + Director)', approvers: ['Manager User', 'Director User'] } },
        { id: 'lr-end', type: 'end', position: { x: 700, y: 200 }, data: { label: 'End', description: 'Leave request completed' } },
      ]),
      connections: JSON.stringify([
        { from: 'lr-start', to: 'lr-form' },
        { from: 'lr-form', to: 'lr-condition' },
        { from: 'lr-condition', to: 'lr-manager', condition: { field: 'lr-4', operator: 'less_than_or_equals', value: '3' } },
        { from: 'lr-condition', to: 'lr-parallel', condition: { field: 'lr-4', operator: 'greater_than', value: '3' } },
        { from: 'lr-manager', to: 'lr-end' },
        { from: 'lr-parallel', to: 'lr-end' },
      ]),
      isActive: true,
      userId: admin.id,
    },
  });
  console.log(`✅ Created workflow: ${leaveRequestWorkflow.name} (with parallel approval for days > 3)`);

  // Performance Review Form
  const performanceReviewForm = await prisma.form.create({
    data: {
      name: 'Performance Review',
      description: 'Employee performance review self-assessment',
      elements: JSON.stringify([
        { id: 'Rating', type: 'number', label: 'Rating', placeholder: 'Rate your performance (1-5)', required: true, validation: { min: 1, max: 5 } },
        { id: 'Comments', type: 'textarea', label: 'Comments', placeholder: 'Describe your performance this quarter', required: false },
      ]),
      isActive: true,
      userId: admin.id,
    },
  });
  console.log(`✅ Created form: ${performanceReviewForm.name}`);

  // Performance Review Workflow
  // Structure: start → form(rating+comments) → condition(rating < 3?) → parallel(IT+HR) → end
  //                                                     ↓ false
  //                                                   end
  const performanceReviewWorkflow = await prisma.workflow.create({
    data: {
      name: 'Performance Review',
      description: 'Employee performance review workflow with HR intervention for low ratings',
      category: 'HR',
      nodes: JSON.stringify([
        { id: 'pr-start', type: 'start', position: { x: 100, y: 200 }, data: { label: 'Start', description: 'Start performance review' } },
        { id: 'pr-form', type: 'form', position: { x: 250, y: 200 }, data: { label: 'Self-Assessment', formId: performanceReviewForm.id } },
        { id: 'pr-condition', type: 'condition', position: { x: 400, y: 200 }, data: { label: 'Check Rating', field: 'Rating', operator: 'less_than', value: '3', trueBranch: 'pr-parallel', falseBranch: 'pr-end' } },
        { id: 'pr-parallel', type: 'parallel', position: { x: 550, y: 200 }, data: { label: 'HR Review', approvers: ['Manager User', 'HR User'] } },
        { id: 'pr-end', type: 'end', position: { x: 700, y: 200 }, data: { label: 'End', description: 'Review completed' } },
      ]),
      connections: JSON.stringify([
        { from: 'pr-start', to: 'pr-form' },
        { from: 'pr-form', to: 'pr-condition' },
        { from: 'pr-condition', to: 'pr-parallel' },
        { from: 'pr-condition', to: 'pr-end' },
        { from: 'pr-parallel', to: 'pr-end' },
      ]),
      isActive: true,
      userId: admin.id,
    },
  });
  console.log(`✅ Created workflow: ${performanceReviewWorkflow.name} (HR intervention for rating < 3)`);

  // ============ Customer Onboarding ============
  const customerOnboardingForm = await prisma.form.create({
    data: {
      name: 'Customer Onboarding',
      description: 'New customer onboarding form',
      elements: JSON.stringify([
        { id: 'co-1', type: 'text', label: 'Customer Name', placeholder: 'Enter customer name', required: true },
        { id: 'co-2', type: 'email', label: 'Email', placeholder: 'customer@email.com', required: true },
        { id: 'co-3', type: 'text', label: 'Company', placeholder: 'Company name', required: true },
        { id: 'co-4', type: 'dropdown', label: 'Business Type', options: ['Startup', 'SME', 'Enterprise', 'Government'], required: true },
        { id: 'co-5', type: 'textarea', label: 'Requirements', placeholder: 'Describe customer requirements', required: false },
      ]),
      isActive: true,
      userId: admin.id,
    },
  });
  console.log(`✅ Created form: ${customerOnboardingForm.name}`);

  // Customer Onboarding Workflow with sub-workflow
  // Structure: start → form → sub-workflow(customer verification) → approval(Manager) → end
  await prisma.workflow.create({
    data: {
      name: 'Customer Onboarding',
      description: 'New customer onboarding workflow',
      category: 'Sales',
      nodes: JSON.stringify([
        { id: 'co-start', type: 'start', position: { x: 100, y: 200 }, data: { label: 'Start', description: 'Start customer onboarding' } },
        { id: 'co-form', type: 'form', position: { x: 250, y: 200 }, data: { label: 'Customer Information', formId: customerOnboardingForm.id } },
        { id: 'co-subworkflow', type: 'sub-workflow', position: { x: 400, y: 200 }, data: { label: 'Verify Customer Info', subWorkflowName: 'Customer Info Verification' } },
        { id: 'co-approval', type: 'approval', position: { x: 550, y: 200 }, data: { label: 'Manager Approval', approverRole: 'MANAGER' } },
        { id: 'co-end', type: 'end', position: { x: 700, y: 200 }, data: { label: 'End', description: 'Onboarding completed' } },
      ]),
      connections: JSON.stringify([
        { from: 'co-start', to: 'co-form' },
        { from: 'co-form', to: 'co-subworkflow' },
        { from: 'co-subworkflow', to: 'co-approval' },
        { from: 'co-approval', to: 'co-end' },
      ]),
      isActive: true,
      userId: admin.id,
    },
  });
  console.log(`✅ Created workflow: Customer Onboarding (with sub-workflow)`);

  // Customer Info Verification Sub-workflow
  const customerVerificationForm = await prisma.form.create({
    data: {
      name: 'Customer Info Verification',
      description: 'Verify customer information for onboarding',
      elements: JSON.stringify([
        { id: 'cv-1', type: 'checkbox', label: 'ID Verified', required: true },
        { id: 'cv-2', type: 'checkbox', label: 'Address Confirmed', required: true },
        { id: 'cv-3', type: 'textarea', label: 'Verification Notes', required: false },
      ]),
      isActive: true,
      userId: admin.id,
    },
  });

  await prisma.workflow.create({
    data: {
      name: 'Customer Info Verification',
      description: 'Sub-workflow to verify customer information',
      category: 'Sales',
      nodes: JSON.stringify([
        { id: 'cv-start', type: 'start', position: { x: 100, y: 200 }, data: { label: 'Start' } },
        { id: 'cv-form', type: 'form', position: { x: 250, y: 200 }, data: { label: 'Verification Form', formId: customerVerificationForm.id } },
        { id: 'cv-end', type: 'end', position: { x: 400, y: 200 }, data: { label: 'End' } },
      ]),
      connections: JSON.stringify([
        { from: 'cv-start', to: 'cv-form' },
        { from: 'cv-form', to: 'cv-end' },
      ]),
      isActive: true,
      userId: admin.id,
    },
  });
  console.log(`✅ Created sub-workflow: Customer Info Verification`);

  // ============ System Enhancement Request ============
  const systemEnhancementForm = await prisma.form.create({
    data: {
      name: 'System Enhancement Request',
      description: 'Request for system improvements or new features',
      elements: JSON.stringify([
        { id: 'se-1', type: 'text', label: 'Title', placeholder: 'Enhancement title', required: true },
        { id: 'se-2', type: 'textarea', label: 'Description', placeholder: 'Describe the enhancement', required: true },
        { id: 'se-3', type: 'dropdown', label: 'Priority', options: ['Low', 'Medium', 'High', 'Critical'], required: true },
        { id: 'se-4', type: 'number', label: 'Estimated Cost', placeholder: 'Estimated cost in USD', required: true },
        { id: 'se-5', type: 'dropdown', label: 'Infrastructure Needed', options: ['None', 'Network', 'Database', 'Network,Database'], required: false },
        { id: 'se-6', type: 'textarea', label: 'Expected Impact', placeholder: 'Expected business impact', required: false },
      ]),
      isActive: true,
      userId: admin.id,
    },
  });

  await prisma.workflow.create({
    data: {
      name: 'System Enhancement Request',
      description: 'Process system enhancement requests with SDLC stages',
      category: 'IT',
      nodes: JSON.stringify([
        { id: 'se-start', type: 'start', position: { x: 50, y: 200 }, data: { label: 'Start' } },
        { id: 'se-form', type: 'form', position: { x: 200, y: 200 }, data: { label: 'Request Details', formId: systemEnhancementForm.id } },
        { id: 'se-req', type: 'task', position: { x: 350, y: 200 }, data: { label: 'Requirements', description: 'Define detailed requirements' } },
        { id: 'se-des', type: 'task', position: { x: 500, y: 200 }, data: { label: 'Design', description: 'Create technical design document' } },
        { id: 'se-dev', type: 'task', position: { x: 650, y: 200 }, data: { label: 'Development', description: 'Implement the enhancement' } },
        { id: 'se-test', type: 'task', position: { x: 800, y: 200 }, data: { label: 'Testing', description: 'Test the implementation' } },
        { id: 'se-approval', type: 'approval', position: { x: 950, y: 200 }, data: { label: 'Final Approval', approverRole: 'MANAGER' } },
        { id: 'se-end', type: 'end', position: { x: 1100, y: 200 }, data: { label: 'End' } },
      ]),
      connections: JSON.stringify([
        { from: 'se-start', to: 'se-form' },
        { from: 'se-form', to: 'se-req' },
        { from: 'se-req', to: 'se-des' },
        { from: 'se-des', to: 'se-dev' },
        { from: 'se-dev', to: 'se-test' },
        { from: 'se-test', to: 'se-approval' },
        { from: 'se-approval', to: 'se-end' },
      ]),
      isActive: true,
      userId: admin.id,
    },
  });
  console.log(`✅ Created workflow: System Enhancement Request (with SDLC stages)`);

  // ============ Expense Reimbursement ============
  const expenseForm = await prisma.form.create({
    data: {
      name: 'Expense Reimbursement',
      description: 'Submit expense claims for reimbursement',
      elements: JSON.stringify([
        { id: 'er-1', type: 'text', label: 'Employee Name', placeholder: 'Enter your name', required: true },
        { id: 'er-2', type: 'number', label: 'Amount', placeholder: 'Enter amount', required: true },
        { id: 'er-3', type: 'textarea', label: 'Description', placeholder: 'Describe the expense', required: true },
        { id: 'er-4', type: 'dropdown', label: 'Category', options: ['Travel', 'Equipment', 'Meals', 'Software', 'Other'], required: true },
        { id: 'er-5', type: 'checkbox', label: 'Receipts Attached', required: true },
      ]),
      isActive: true,
      userId: admin.id,
    },
  });
  console.log(`✅ Created form: ${expenseForm.name}`);

  // Expense Reimbursement Workflow with Parallel Approval (Manager + Finance)
  await prisma.workflow.create({
    data: {
      name: 'Expense Reimbursement',
      description: 'Expense reimbursement with Manager and Finance approval',
      category: 'Finance',
      nodes: JSON.stringify([
        { id: 'er-start', type: 'start', position: { x: 100, y: 200 }, data: { label: 'Start' } },
        { id: 'er-form', type: 'form', position: { x: 250, y: 200 }, data: { label: 'Expense Form', formId: expenseForm.id } },
        { id: 'er-parallel', type: 'parallel', position: { x: 400, y: 200 }, data: { label: 'Parallel Approval (Manager + Finance)', approvers: ['Manager User', 'Finance User'] } },
        { id: 'er-end', type: 'end', position: { x: 550, y: 200 }, data: { label: 'End' } },
      ]),
      connections: JSON.stringify([
        { from: 'er-start', to: 'er-form' },
        { from: 'er-form', to: 'er-parallel' },
        { from: 'er-parallel', to: 'er-end' },
      ]),
      isActive: true,
      userId: admin.id,
    },
  });
  console.log(`✅ Created workflow: Expense Reimbursement (parallel approval)`);

  // Budget Check Workflow
  const budgetCheckForm = await prisma.form.create({
    data: {
      name: 'Budget Check',
      description: 'Check budget availability for expenses',
      elements: JSON.stringify([
        { id: 'bc-1', type: 'number', label: 'Budget Amount', placeholder: 'Enter budget amount', required: true },
        { id: 'bc-2', type: 'textarea', label: 'Justification', placeholder: 'Budget justification', required: true },
      ]),
      isActive: true,
      userId: admin.id,
    },
  });

  await prisma.workflow.create({
    data: {
      name: 'Budget Check Workflow',
      description: 'Verify budget availability for large expenses',
      category: 'Finance',
      nodes: JSON.stringify([
        { id: 'bc-start', type: 'start', position: { x: 100, y: 200 }, data: { label: 'Start' } },
        { id: 'bc-form', type: 'form', position: { x: 250, y: 200 }, data: { label: 'Budget Check Form', formId: budgetCheckForm.id } },
        { id: 'bc-review', type: 'approval', position: { x: 400, y: 200 }, data: { label: 'Finance Review', approverRole: 'MANAGER' } },
        { id: 'bc-end', type: 'end', position: { x: 550, y: 200 }, data: { label: 'End' } },
      ]),
      connections: JSON.stringify([
        { from: 'bc-start', to: 'bc-form' },
        { from: 'bc-form', to: 'bc-review' },
        { from: 'bc-review', to: 'bc-end' },
      ]),
      isActive: true,
      userId: admin.id,
    },
  });
  console.log(`✅ Created workflow: Budget Check Workflow`);

  // SDLC Sub-workflows for System Enhancement
  const networkForm = await prisma.form.create({
    data: {
      name: 'Network Setup',
      description: 'Network infrastructure setup request',
      elements: JSON.stringify([
        { id: 'ns-1', type: 'text', label: 'Location', placeholder: 'Office location', required: true },
        { id: 'ns-2', type: 'dropdown', label: 'Network Type', options: ['Wired', 'Wireless', 'Both'], required: true },
        { id: 'ns-3', type: 'textarea', label: 'Requirements', placeholder: 'Network requirements', required: false },
      ]),
      isActive: true,
      userId: admin.id,
    },
  });

  const networkWorkflow = await prisma.workflow.create({
    data: {
      name: 'Network Infrastructure Setup',
      description: 'Network infrastructure setup sub-workflow',
      category: 'IT',
      nodes: JSON.stringify([
        { id: 'ni-start', type: 'start', position: { x: 100, y: 200 }, data: { label: 'Start' } },
        { id: 'ni-form', type: 'form', position: { x: 250, y: 200 }, data: { label: 'Network Request Form', formId: networkForm.id } },
        { id: 'ni-review', type: 'approval', position: { x: 400, y: 200 }, data: { label: 'IT Approval', approverRole: 'MANAGER' } },
        { id: 'ni-end', type: 'end', position: { x: 550, y: 200 }, data: { label: 'End' } },
      ]),
      connections: JSON.stringify([
        { from: 'ni-start', to: 'ni-form' },
        { from: 'ni-form', to: 'ni-review' },
        { from: 'ni-review', to: 'ni-end' },
      ]),
      isActive: true,
      userId: admin.id,
    },
  });
  console.log(`✅ Created sub-workflow: Network Infrastructure Setup`);

  const databaseForm = await prisma.form.create({
    data: {
      name: 'Database Request',
      description: 'Database setup or modification request',
      elements: JSON.stringify([
        { id: 'db-1', type: 'text', label: 'Database Name', placeholder: 'Enter database name', required: true },
        { id: 'db-2', type: 'dropdown', label: 'Database Type', options: ['MySQL', 'PostgreSQL', 'MongoDB', 'Other'], required: true },
        { id: 'db-3', type: 'textarea', label: 'Schema Requirements', placeholder: 'Schema details', required: false },
      ]),
      isActive: true,
      userId: admin.id,
    },
  });

  const databaseWorkflow = await prisma.workflow.create({
    data: {
      name: 'Database Setup',
      description: 'Database setup sub-workflow',
      category: 'IT',
      nodes: JSON.stringify([
        { id: 'ds-start', type: 'start', position: { x: 100, y: 200 }, data: { label: 'Start' } },
        { id: 'ds-form', type: 'form', position: { x: 250, y: 200 }, data: { label: 'Database Request Form', formId: databaseForm.id } },
        { id: 'ds-review', type: 'approval', position: { x: 400, y: 200 }, data: { label: 'DBA Approval', approverRole: 'MANAGER' } },
        { id: 'ds-end', type: 'end', position: { x: 550, y: 200 }, data: { label: 'End' } },
      ]),
      connections: JSON.stringify([
        { from: 'ds-start', to: 'ds-form' },
        { from: 'ds-form', to: 'ds-review' },
        { from: 'ds-review', to: 'ds-end' },
      ]),
      isActive: true,
      userId: admin.id,
    },
  });
  console.log(`✅ Created sub-workflow: Database Setup`);

  console.log('✅ Created additional sample data');

  // ============ Summary ============
  console.log('\n📊 Seed Summary:');
  console.log(`   Users: 4 (admin, manager, employee, director)`);
  console.log(`   Roles: ${ROLES.length} (Admin, Manager, User, Viewer)`);
  console.log(`   Permissions: ${PERMISSIONS.length}`);
  console.log('\n🔑 Test Credentials:');
  console.log('   admin@example.com / password123 (ADMIN role)');
  console.log('   manager@example.com / password123 (MANAGER role)');
  console.log('   employee@example.com / password123 (USER role)');
  console.log('   director@example.com / password123 (MANAGER role)');
  console.log('\n✅ Seed completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
