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
