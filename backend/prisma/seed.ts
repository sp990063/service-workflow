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
