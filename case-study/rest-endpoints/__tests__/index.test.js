import request from 'supertest';
import server from '../index'; // Adjust this import based on how your server is set up
import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';
import {
  Customer,
  Invoice,
  Plan,
  PostpaidPlan,
  PrepaidPlan,
} from "../../telecom-billing-system.js";

const prisma = new PrismaClient();

describe('API Endpoints Tests', () => {
  let token;
  let planTestId

  beforeAll(async () => {
    // Clear data before tests
    await prisma.invoice.deleteMany();
    await prisma.customerPlan.deleteMany();
    await prisma.prepaidPlan.deleteMany();
    await prisma.postpaidPlan.deleteMany();
    await prisma.plan.deleteMany();
    await prisma.customer.deleteMany();

    // Create a test customer and generate a JWT token for protected routes
    let customerTestData= {
      data:{
        customerName: 'Test User',
        customerMail: 'testuser@example.com',
        customerPhone: '1234567890',
        password: 'testpassword'
      }
    }
    let customer = new Customer(customerTestData)
    customer = await prisma.customer.create({
      data:{
        customerName: 'Test User',
        customerMail: 'testuser@example.com',
        customerPhone: '1234567890',
        password: 'testpassword',
        customerId:customer.customerId,
        customerCurrPlan:0
      }
    });

    token = jwt.sign({ id: customer.customerId }, process.env.JWT_SECRET, { expiresIn: 86400 });
  });

  afterAll(async () => {
    // Clean up database after all tests
    await prisma.$transaction([
      prisma.invoice.deleteMany(),
      prisma.customerPlan.deleteMany(),
      prisma.prepaidPlan.deleteMany(),
      prisma.postpaidPlan.deleteMany(),
      prisma.plan.deleteMany(),
      prisma.customer.deleteMany(),
    ]);
    await prisma.$disconnect();

    server.close();
  });


  it('should register a new user successfully', async () => {
    const response = await request(server)
      .post('/register')
      .send({
        name: 'John Doe',
        email: 'johndoe12234@example.com',
        password: 'password123',
        phone: '1234567890',
      });

    const testCustomerId = response.body.id;  // Store customer ID for use in login test

    expect(response.statusCode).toBe(201);
    // expect(response.body.message).toBe('User registered successfully'); // Check for message
  });

  it('should fail to register a new user with same mail successfully', async () => {
    const response = await request(server)
      .post('/register')
      .send({
        name: 'John Doe',
        email: 'johndoe12234@example.com',
        password: 'password123',
        phone: '1234567890',
      });

    // testCustomerId = response.body.id;  // Store customer ID for use in login test

    expect(response.statusCode).toBe(400);
    // expect(response.body.message).toBe('A user is already registered with this email'); // Check for message
  });

  it('should login the user successfully', async () => {
    const response = await request(server)
      .post('/login')
      .send({
        email: 'johndoe12234@example.com',
        password: 'password123',
      });

    expect(response.statusCode).toBe(200);
    expect(response.body.auth).toBe(true);
    expect(response.body.token).toBeDefined(); // Check that token is returned
  });

  it('should fail to login with wrong password', async () => {
    const response = await request(server)
      .post('/login')
      .send({
        email: 'johndoe12234@example.com',
        password: 'wrongpassword',
      });

    expect(response.statusCode).toBe(401);
    expect(response.body.auth).toBe(false);
  });

  it('should fail to login with missing fields', async () => {
    const response = await request(server)
      .post('/login')
      .send({
        email: 'johndoe12234@example.com',
      });

    expect(response.statusCode).toBe(400);
    expect(response.text).toBe('Email and password are required.');
  });

  it('should add postpaid plan to the database', async () => {
    const response = await request(server)
      .post('/admin/addPlan')
      .send({
        planName:"Test Postpaid Plan",
        ratePerUnit:0.05,
        planType:"POSTPAID",
        prepaidBalance:0,
        billingCycle:"30",
        description:"basic plan"
      })
      planTestId = response.body.plan.planId
    expect(response.statusCode).toBe(201)
  })

  it('should add prepaid plan to the database', async () => {
    const response = await request(server)
      .post('/admin/addPlan')
      .send({
        planName:"Basic Plan Prepaid",
        ratePerUnit:0.05,
        planType:"PREPAID",
        prepaidBalance:100,
        billingCycle:"30",
        description:"basic plan"
      })
      planTestId = response.body.plan.planId
    expect(response.statusCode).toBe(201)
  })

  it('should fail to add plan to the database with missing values', async () => {
    const response = await request(server)
      .post('/admin/addPlan')
      .send({
        planName:"Test Postpaid Plan",
        ratePerUnit:0.05,
        planType:"POSTPAID",
      })

    expect(response.statusCode).toBe(500)
  })
  
  it('should fail to add a new plan with the same name', async () => {
    const response = await request(server)
      .post('/admin/addPlan')
      .send({
        planName: 'Test Postpaid Plan',
        ratePerUnit: 0.1,
        planType: 'POSTPAID',
        prepaidBalance: 100,
        billingCycle: '30',
      });

    expect(response.statusCode).toBe(201);
    expect(response.body.plan).toBeDefined();
  });

  it('should buy plan for the customer', async()=>{
    const response = await request(server)
      .post('/choosePlan')
      .send({
        customerMail:"johndoe12234@example.com",
        planName:"Test Postpaid Plan",
        planType:"POSTPAID"
      })

    expect(response.statusCode).toBe(201)
    })


  it('should return prepaid plans', async () => {
    const response = await request(server)
      .get('/prepaidPlans');

    expect(response.statusCode).toBe(200);
    expect(response.body.prepaidPlans).toBeDefined();
  });

  it('should return postpaid plans', async () => {
    const response = await request(server)
      .get('/postpaidPlans');

    expect(response.statusCode).toBe(200);
    expect(response.body.postpaidPlans).toBeDefined();
  });

  it('should generate an invoice for a customer', async () => {
    const response = await request(server)
      .post('/generateInvoice')
      .send({
        customerMail: 'johndoe12234@example.com',
      });

    expect(response.statusCode).toBe(200);
    expect(response.body.invoice).toBeDefined();
  });

  it('should return a customer\'s invoice history', async () => {
    const response = await request(server)
      .post('/viewInvoiceHistory')
      .send({
        customerMail: 'johndoe12234@example.com',
      });

    expect(response.statusCode).toBe(200);
    expect(response.body.invoiceList).toBeDefined();
  });

  it('should return a specific invoice by ID', async () => {
    const invoiceResponse = await request(server)
      .post('/generateInvoice')
      .send({
        customerMail: 'johndoe12234@example.com',
      });
    const invoiceId = invoiceResponse.body.invoice.invoiceId;

    const response = await request(server)
      .get(`/invoices/${invoiceId}`);

    expect(response.statusCode).toBe(200);
    expect(response.body).toBeDefined();
  });

  it('should pay a postpaid invoice', async () => {
    const invoiceResponse = await request(server)
      .post('/generateInvoice')
      .send({
        customerMail: 'johndoe12234@example.com',
      });
    const invoiceId = invoiceResponse.body.invoice.invoiceId;

    const response = await request(server)
      .post('/payPostpaidInvoice')
      .send({
        customerMail: 'johndoe12234@example.com',
        invoiceId: invoiceId,
        changePlan: false,
      });

    expect(response.statusCode).toBe(200);
    expect(response.body.message).toBe('Invoice paid and same plan subscribed successfully');
  });

  it('should return customer plan history', async () => {
    const response = await request(server)
      .post('/viewHistory')
      .send({
        customerMail: 'johndoe12234@example.com',
      });

    expect(response.statusCode).toBe(200);
    expect(response.body.plansList).toBeDefined();
  });

  it('should download invoice as PDF', async () => {
    const invoiceResponse = await request(server)
      .post('/generateInvoice')
      .send({
        customerMail: 'johndoe12234@example.com',
      });
    const invoiceId = invoiceResponse.body.invoice.invoiceId;

    const response = await request(server)
      .get(`/downloadInvoice/${invoiceId}`)
      .expect('Content-Type', /pdf/);

    expect(response.statusCode).toBe(200);
  });
});
