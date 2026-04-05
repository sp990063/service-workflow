import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting seed...');

  // Clean existing data
  await prisma.notification.deleteMany();
  await prisma.approvalRequest.deleteMany();
  await prisma.workflowInstance.deleteMany();
  await prisma.workflow.deleteMany();
  await prisma.formSubmission.deleteMany();
  await prisma.form.deleteMany();
  await prisma.user.deleteMany();

  // Create users
  const hashedPassword = await bcrypt.hash('password123', 10);

  const admin = await prisma.user.create({
    data: {
      email: 'admin@example.com',
      password: hashedPassword,
      name: 'Admin User',
      role: 'ADMIN',
      department: 'IT',
    },
  });

  const manager = await prisma.user.create({
    data: {
      email: 'manager@example.com',
      password: hashedPassword,
      name: 'Manager User',
      role: 'MANAGER',
      department: 'Operations',
    },
  });

  const employee = await prisma.user.create({
    data: {
      email: 'employee@example.com',
      password: hashedPassword,
      name: 'Employee User',
      role: 'USER',
      department: 'Sales',
    },
  });

  console.log(`✅ Created users: admin, manager, employee`);

  // Create sample form
  const sampleForm = await prisma.form.create({
    data: {
      name: 'IT Equipment Request',
      userId: admin.id,
      description: 'Request form for IT equipment',
      elements: JSON.stringify([
        {
          id: 'field-1',
          type: 'text',
          label: 'Employee Name',
          placeholder: 'Enter your name',
          required: true,
        },
        {
          id: 'field-2',
          type: 'email',
          label: 'Email',
          placeholder: 'your@email.com',
          required: true,
        },
        {
          id: 'field-3',
          type: 'select',
          label: 'Equipment Type',
          options: ['Laptop', 'Monitor', 'Keyboard', 'Mouse', 'Headset'],
          required: true,
        },
        {
          id: 'field-4',
          type: 'textarea',
          label: 'Justification',
          placeholder: 'Why do you need this equipment?',
          required: true,
        },
      ]),
      isActive: true,
    },
  });

  console.log(`✅ Created form: ${sampleForm.name}`);

  // Create sample workflow
  const sampleWorkflow = await prisma.workflow.create({
    data: {
      name: 'IT Equipment Approval',
      userId: admin.id,
      description: 'Workflow for IT equipment requests',
      category: 'IT',
      nodes: JSON.stringify([
        {
          id: 'node-start',
          type: 'start',
          position: { x: 100, y: 200 },
          data: { label: 'Start', description: 'Start of workflow' },
        },
        {
          id: 'node-form',
          type: 'form',
          position: { x: 300, y: 200 },
          data: { label: 'Fill Request Form', formId: sampleForm.id },
        },
        {
          id: 'node-approval',
          type: 'approval',
          position: { x: 500, y: 200 },
          data: { label: 'Manager Approval', approverRole: 'MANAGER' },
        },
        {
          id: 'node-end',
          type: 'end',
          position: { x: 700, y: 200 },
          data: { label: 'End', description: 'Workflow completed' },
        },
      ]),
      connections: JSON.stringify([
        { from: 'node-start', to: 'node-form' },
        { from: 'node-form', to: 'node-approval' },
        { from: 'node-approval', to: 'node-end' },
      ]),
      isActive: true,
    },
  });

  console.log(`✅ Created workflow: ${sampleWorkflow.name}`);

  // Create another form
  const feedbackForm = await prisma.form.create({
    data: {
      name: 'Customer Feedback',
      userId: admin.id,
      description: 'Capture customer feedback',
      elements: JSON.stringify([
        {
          id: 'fb-1',
          type: 'text',
          label: 'Customer Name',
          required: true,
        },
        {
          id: 'fb-2',
          type: 'rating',
          label: 'Rating',
          maxRating: 5,
          required: true,
        },
        {
          id: 'fb-3',
          type: 'textarea',
          label: 'Comments',
          placeholder: 'Share your feedback...',
        },
      ]),
      isActive: true,
    },
  });

  console.log(`✅ Created form: ${feedbackForm.name}`);

  // Create another workflow
  const feedbackWorkflow = await prisma.workflow.create({
    data: {
      name: 'Customer Feedback Workflow',
      userId: admin.id,
      description: 'Process customer feedback submissions',
      category: 'Customer Service',
      nodes: JSON.stringify([
        {
          id: 'fb-start',
          type: 'start',
          position: { x: 100, y: 200 },
          data: { label: 'Start' },
        },
        {
          id: 'fb-form',
          type: 'form',
          position: { x: 300, y: 200 },
          data: { label: 'Submit Feedback', formId: feedbackForm.id },
        },
        {
          id: 'fb-review',
          type: 'task',
          position: { x: 500, y: 200 },
          data: { label: 'Review Feedback', assigneeRole: 'MANAGER' },
        },
        {
          id: 'fb-end',
          type: 'end',
          position: { x: 700, y: 200 },
          data: { label: 'End' },
        },
      ]),
      connections: JSON.stringify([
        { from: 'fb-start', to: 'fb-form' },
        { from: 'fb-form', to: 'fb-review' },
        { from: 'fb-review', to: 'fb-end' },
      ]),
      isActive: true,
    },
  });

  console.log(`✅ Created workflow: ${feedbackWorkflow.name}`);

  // Create a test workflow instance
  const instance = await prisma.workflowInstance.create({
    data: {
      workflowId: sampleWorkflow.id,
      userId: employee.id,
      currentNodeId: 'node-form',
      status: 'PENDING',
      formData: JSON.stringify({
        'field-1': 'John Smith',
        'field-3': 'Laptop',
      }),
      history: JSON.stringify([
        {
          nodeId: 'node-start',
          action: 'Workflow started',
          timestamp: new Date().toISOString(),
        },
      ]),
    },
  });

  // Create SDLC Process workflow (sub-workflow)
  const sdlcWorkflow = await prisma.workflow.create({
    data: {
      name: 'SDLC Process',
      userId: admin.id,
      description: 'Software Development Life Cycle - Requirements to Deployment',
      category: 'IT',
      nodes: JSON.stringify([
        { id: 'sdlc-start', type: 'start', position: { x: 50, y: 200 }, data: { label: 'Start', description: 'SDLC begins' } },
        { id: 'sdlc-req', type: 'task', position: { x: 200, y: 200 }, data: { label: 'Requirements', description: 'BA creates PRD', assigneeRole: 'BA' } },
        { id: 'sdlc-design', type: 'task', position: { x: 350, y: 200 }, data: { label: 'Design', description: 'Architect creates design doc', assigneeRole: 'ARCHITECT' } },
        { id: 'sdlc-dev', type: 'task', position: { x: 500, y: 200 }, data: { label: 'Development', description: 'Developer implements', assigneeRole: 'DEVELOPER' } },
        { id: 'sdlc-test', type: 'task', position: { x: 650, y: 200 }, data: { label: 'Testing', description: 'QA performs testing', assigneeRole: 'QA' } },
        { id: 'sdlc-uat', type: 'task', position: { x: 800, y: 200 }, data: { label: 'UAT', description: 'User acceptance testing', assigneeRole: 'USER' } },
        { id: 'sdlc-deploy', type: 'task', position: { x: 950, y: 200 }, data: { label: 'Deployment', description: 'Ops deploys to production', assigneeRole: 'OPS' } },
        { id: 'sdlc-end', type: 'end', position: { x: 1100, y: 200 }, data: { label: 'End', description: 'Enhancement delivered' } },
      ]),
      connections: JSON.stringify([
        { from: 'sdlc-start', to: 'sdlc-req' },
        { from: 'sdlc-req', to: 'sdlc-design' },
        { from: 'sdlc-design', to: 'sdlc-dev' },
        { from: 'sdlc-dev', to: 'sdlc-test' },
        { from: 'sdlc-test', to: 'sdlc-uat' },
        { from: 'sdlc-uat', to: 'sdlc-deploy' },
        { from: 'sdlc-deploy', to: 'sdlc-end' },
      ]),
      isActive: true,
    },
  });

  console.log(`✅ Created workflow: ${sdlcWorkflow.name}`);

  // Create System Enhancement Request form
  const enhancementForm = await prisma.form.create({
    data: {
      name: 'System Enhancement Request',
      userId: admin.id,
      description: 'Submit a system enhancement request for IT review',
      elements: JSON.stringify([
        { id: 'enh-title', type: 'text', label: 'Enhancement Title', placeholder: 'Enter enhancement title', required: true },
        { id: 'enh-desc', type: 'textarea', label: 'Description', placeholder: 'Describe the enhancement', required: true },
        { id: 'enh-type', type: 'select', label: 'Type', options: ['New Feature', 'Bug Fix', 'Improvement', 'Refactoring'], required: true },
        { id: 'enh-priority', type: 'select', label: 'Priority', options: ['Low', 'Medium', 'High', 'Critical'], required: true },
        { id: 'enh-budget', type: 'number', label: 'Estimated Budget (USD)', placeholder: '0', required: true },
        { id: 'enh-justification', type: 'textarea', label: 'Business Justification', placeholder: 'Why is this needed?', required: true },
      ]),
      isActive: true,
    },
  });

  console.log(`✅ Created form: ${enhancementForm.name}`);

  // Create System Enhancement Request workflow (main workflow with sub-workflow reference)
  await prisma.workflow.create({
    data: {
      name: 'System Enhancement Request',
      userId: admin.id,
      description: 'Submit and track system enhancement requests through SDLC',
      category: 'IT',
      nodes: JSON.stringify([
        { id: 'enh-start', type: 'start', position: { x: 100, y: 200 }, data: { label: 'Start', description: 'Enhancement request received' } },
        { id: 'enh-form', type: 'form', position: { x: 300, y: 200 }, data: { label: 'Submit Enhancement Request', formId: enhancementForm.id } },
        { id: 'enh-sdlc', type: 'subWorkflow', position: { x: 500, y: 200 }, data: { label: 'Execute SDLC', childWorkflowId: sdlcWorkflow.id, waitForCompletion: true } },
        { id: 'enh-end', type: 'end', position: { x: 700, y: 200 }, data: { label: 'End', description: 'Enhancement delivered' } },
      ]),
      connections: JSON.stringify([
        { from: 'enh-start', to: 'enh-form' },
        { from: 'enh-form', to: 'enh-sdlc' },
        { from: 'enh-sdlc', to: 'enh-end' },
      ]),
      isActive: true,
    },
  });

  console.log(`✅ Created workflow: System Enhancement Request`);

  // Create SDLC with Rejection workflow
  await prisma.workflow.create({
    data: {
      name: 'SDLC with Rejection',
      userId: admin.id,
      description: 'SDLC process with BA rejection at requirements stage',
      category: 'IT',
      nodes: JSON.stringify([
        { id: 'rej-start', type: 'start', position: { x: 50, y: 200 }, data: { label: 'Start' } },
        { id: 'rej-req', type: 'task', position: { x: 200, y: 200 }, data: { label: 'Requirements Review', assigneeRole: 'BA' } },
        { id: 'rej-condition', type: 'condition', position: { x: 350, y: 200 }, data: { label: 'Feasible?', field: 'approved', operator: 'equals', value: 'true' } },
        { id: 'rej-reject', type: 'task', position: { x: 500, y: 100 }, data: { label: 'Reject Request', assigneeRole: 'BA' } },
        { id: 'rej-end-reject', type: 'end', position: { x: 650, y: 100 }, data: { label: 'Rejected' } },
        { id: 'rej-end-approve', type: 'end', position: { x: 650, y: 300 }, data: { label: 'Approved' } },
      ]),
      connections: JSON.stringify([
        { from: 'rej-start', to: 'rej-req' },
        { from: 'rej-req', to: 'rej-condition' },
        { from: 'rej-condition', to: 'rej-reject', condition: { field: 'approved', operator: 'equals', value: 'false' } },
        { from: 'rej-condition', to: 'rej-end-approve', condition: { field: 'approved', operator: 'equals', value: 'true' } },
        { from: 'rej-reject', to: 'rej-end-reject' },
      ]),
      isActive: true,
    },
  });

  console.log(`✅ Created workflow: SDLC with Rejection`);

  // Create Budget Check Workflow
  await prisma.workflow.create({
    data: {
      name: 'Budget Check Workflow',
      userId: admin.id,
      description: 'Enhancement request blocked when budget exceeds limit',
      category: 'IT',
      nodes: JSON.stringify([
        { id: 'bud-start', type: 'start', position: { x: 50, y: 200 }, data: { label: 'Start' } },
        { id: 'bud-form', type: 'form', position: { x: 200, y: 200 }, data: { label: 'Submit Request', formId: enhancementForm.id } },
        { id: 'bud-condition', type: 'condition', position: { x: 400, y: 200 }, data: { label: 'Budget Check', field: 'enh-budget', operator: 'lessThan', value: '10000' } },
        { id: 'bud-approved', type: 'task', position: { x: 600, y: 100 }, data: { label: 'Approved Path', assigneeRole: 'MANAGER' } },
        { id: 'bud-blocked', type: 'task', position: { x: 600, y: 300 }, data: { label: 'Budget Approval Needed', assigneeRole: 'ADMIN' } },
        { id: 'bud-end', type: 'end', position: { x: 800, y: 200 }, data: { label: 'End' } },
      ]),
      connections: JSON.stringify([
        { from: 'bud-start', to: 'bud-form' },
        { from: 'bud-form', to: 'bud-condition' },
        { from: 'bud-condition', to: 'bud-approved', condition: { field: 'enh-budget', operator: 'lessThan', value: '10000' } },
        { from: 'bud-condition', to: 'bud-blocked', condition: { field: 'enh-budget', operator: 'greaterThanOrEqual', value: '10000' } },
        { from: 'bud-approved', to: 'bud-end' },
        { from: 'bud-blocked', to: 'bud-end' },
      ]),
      isActive: true,
    },
  });

  console.log(`✅ Created workflow: Budget Check Workflow`);

  // Create Test Failure Blocking Workflow
  await prisma.workflow.create({
    data: {
      name: 'Test Failure Blocking Workflow',
      userId: admin.id,
      description: 'Blocks deployment when QA finds critical bugs',
      category: 'IT',
      nodes: JSON.stringify([
        { id: 'tfb-start', type: 'start', position: { x: 50, y: 200 }, data: { label: 'Start' } },
        { id: 'tfb-dev', type: 'task', position: { x: 200, y: 200 }, data: { label: 'Development', assigneeRole: 'DEVELOPER' } },
        { id: 'tfb-test', type: 'task', position: { x: 350, y: 200 }, data: { label: 'QA Testing', assigneeRole: 'QA' } },
        { id: 'tfb-condition', type: 'condition', position: { x: 500, y: 200 }, data: { label: 'Tests Pass?', field: 'testsPassed', operator: 'equals', value: 'true' } },
        { id: 'tfb-deploy', type: 'task', position: { x: 650, y: 100 }, data: { label: 'Deploy to Production', assigneeRole: 'OPS' } },
        { id: 'tfb-fix', type: 'task', position: { x: 650, y: 300 }, data: { label: 'Fix Issues', assigneeRole: 'DEVELOPER' } },
        { id: 'tfb-end', type: 'end', position: { x: 800, y: 200 }, data: { label: 'End' } },
      ]),
      connections: JSON.stringify([
        { from: 'tfb-start', to: 'tfb-dev' },
        { from: 'tfb-dev', to: 'tfb-test' },
        { from: 'tfb-test', to: 'tfb-condition' },
        { from: 'tfb-condition', to: 'tfb-deploy', condition: { field: 'testsPassed', operator: 'equals', value: 'true' } },
        { from: 'tfb-condition', to: 'tfb-fix', condition: { field: 'testsPassed', operator: 'equals', value: 'false' } },
        { from: 'tfb-deploy', to: 'tfb-end' },
        { from: 'tfb-fix', to: 'tfb-test' },
      ]),
      isActive: true,
    },
  });

  console.log(`✅ Created workflow: Test Failure Blocking Workflow`);

  console.log(`✅ Created workflow instance for ${employee.name}`);

  // Create notifications
  await prisma.notification.create({
    data: {
      userId: manager.id,
      type: 'APPROVAL_REQUIRED',
      title: 'New Equipment Request',
      message: 'John Smith has requested a new Laptop.',
      data: JSON.stringify({ instanceId: instance.id }),
    },
  });

  await prisma.notification.create({
    data: {
      userId: employee.id,
      type: 'WORKFLOW_STARTED',
      title: 'Request Submitted',
      message: 'Your IT equipment request has been submitted.',
      data: JSON.stringify({ instanceId: instance.id }),
    },
  });

  console.log(`✅ Created notifications`);

  console.log('\n🎉 Seed completed successfully!\n');
  console.log('Test accounts:');
  console.log('  Admin:    admin@example.com / password123');
  console.log('  Manager:  manager@example.com / password123');
  console.log('  Employee: employee@example.com / password123');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
