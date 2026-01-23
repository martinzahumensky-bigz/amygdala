/**
 * Data Generators for Meridian Bank
 *
 * Generates realistic banking data with intentional quality issues
 * for demonstrating Amygdala's detection capabilities.
 */

// Seed for reproducible random generation
let seed = 12345;
function seededRandom(): number {
  seed = (seed * 1103515245 + 12345) & 0x7fffffff;
  return seed / 0x7fffffff;
}

export function resetSeed(newSeed: number = 12345) {
  seed = newSeed;
}

// Helper to pick random item from array
function pick<T>(arr: T[]): T {
  return arr[Math.floor(seededRandom() * arr.length)];
}

// Helper to generate random number in range
function randomInt(min: number, max: number): number {
  return Math.floor(seededRandom() * (max - min + 1)) + min;
}

function randomFloat(min: number, max: number, decimals: number = 2): number {
  const value = seededRandom() * (max - min) + min;
  return Number(value.toFixed(decimals));
}

// First and last names for generation
const FIRST_NAMES = [
  'James', 'Mary', 'John', 'Patricia', 'Robert', 'Jennifer', 'Michael', 'Linda',
  'William', 'Elizabeth', 'David', 'Barbara', 'Richard', 'Susan', 'Joseph', 'Jessica',
  'Thomas', 'Sarah', 'Charles', 'Karen', 'Christopher', 'Nancy', 'Daniel', 'Lisa',
  'Matthew', 'Betty', 'Anthony', 'Margaret', 'Mark', 'Sandra', 'Donald', 'Ashley',
  'Steven', 'Kimberly', 'Paul', 'Emily', 'Andrew', 'Donna', 'Joshua', 'Michelle',
  'Kenneth', 'Dorothy', 'Kevin', 'Carol', 'Brian', 'Amanda', 'George', 'Melissa'
];

const LAST_NAMES = [
  'Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis',
  'Rodriguez', 'Martinez', 'Hernandez', 'Lopez', 'Gonzalez', 'Wilson', 'Anderson',
  'Thomas', 'Taylor', 'Moore', 'Jackson', 'Martin', 'Lee', 'Perez', 'Thompson',
  'White', 'Harris', 'Sanchez', 'Clark', 'Ramirez', 'Lewis', 'Robinson', 'Walker',
  'Young', 'Allen', 'King', 'Wright', 'Scott', 'Torres', 'Nguyen', 'Hill', 'Flores'
];

const CITIES = [
  { city: 'New York', state: 'NY' },
  { city: 'Los Angeles', state: 'CA' },
  { city: 'Chicago', state: 'IL' },
  { city: 'Houston', state: 'TX' },
  { city: 'Phoenix', state: 'AZ' },
  { city: 'Philadelphia', state: 'PA' },
  { city: 'San Antonio', state: 'TX' },
  { city: 'San Diego', state: 'CA' },
  { city: 'Dallas', state: 'TX' },
  { city: 'San Jose', state: 'CA' },
  { city: 'Austin', state: 'TX' },
  { city: 'Jacksonville', state: 'FL' },
  { city: 'Fort Worth', state: 'TX' },
  { city: 'Columbus', state: 'OH' },
  { city: 'Charlotte', state: 'NC' },
  { city: 'Seattle', state: 'WA' },
  { city: 'Denver', state: 'CO' },
  { city: 'Boston', state: 'MA' },
  { city: 'Nashville', state: 'TN' },
  { city: 'Portland', state: 'OR' }
];

const EMAIL_DOMAINS = ['gmail.com', 'yahoo.com', 'outlook.com', 'hotmail.com', 'icloud.com'];

const TRANSACTION_TYPES = ['deposit', 'withdrawal', 'transfer', 'payment', 'fee', 'interest'];

const TRANSACTION_DESCRIPTIONS: Record<string, string[]> = {
  deposit: ['Payroll Deposit', 'Cash Deposit', 'Check Deposit', 'Wire Transfer In', 'Mobile Deposit'],
  withdrawal: ['ATM Withdrawal', 'Cash Withdrawal', 'Wire Transfer Out'],
  transfer: ['Transfer to Savings', 'Transfer to Checking', 'Internal Transfer', 'External Transfer'],
  payment: ['Bill Payment', 'Credit Card Payment', 'Loan Payment', 'Utility Payment', 'Rent Payment'],
  fee: ['Monthly Fee', 'Overdraft Fee', 'Wire Fee', 'ATM Fee'],
  interest: ['Interest Payment', 'Interest Credit']
};

// Customer Segments
export const CUSTOMER_SEGMENTS = [
  { segment_id: 'SEG-PREM', segment_name: 'Premium', description: 'High-value customers with $100K+ in assets', priority: 1 },
  { segment_id: 'SEG-BUSI', segment_name: 'Business', description: 'Small business owners and entrepreneurs', priority: 2 },
  { segment_id: 'SEG-STAN', segment_name: 'Standard', description: 'Regular retail banking customers', priority: 3 },
  { segment_id: 'SEG-STUD', segment_name: 'Student', description: 'College students and young adults', priority: 4 },
  { segment_id: 'SEG-RETD', segment_name: 'Retiree', description: 'Retired customers with pension accounts', priority: 5 }
];

// Branch definitions
export const BRANCHES = [
  { branch_id: 'BR-NYC-001', branch_name: 'Downtown Manhattan', region: 'Northeast', city: 'New York', state: 'NY', manager_name: 'Sarah Johnson' },
  { branch_id: 'BR-NYC-002', branch_name: 'Midtown East', region: 'Northeast', city: 'New York', state: 'NY', manager_name: 'Michael Chen' },
  { branch_id: 'BR-NYC-003', branch_name: 'Brooklyn Heights', region: 'Northeast', city: 'Brooklyn', state: 'NY', manager_name: 'David Williams' },
  { branch_id: 'BR-BOS-001', branch_name: 'Boston Financial', region: 'Northeast', city: 'Boston', state: 'MA', manager_name: 'Emily Davis' },
  { branch_id: 'BR-CHI-001', branch_name: 'Chicago Loop', region: 'Midwest', city: 'Chicago', state: 'IL', manager_name: 'Robert Martinez' },
  { branch_id: 'BR-CHI-002', branch_name: 'Magnificent Mile', region: 'Midwest', city: 'Chicago', state: 'IL', manager_name: 'Jennifer Lee' },
  { branch_id: 'BR-DAL-001', branch_name: 'Dallas Central', region: 'South', city: 'Dallas', state: 'TX', manager_name: 'James Wilson' },
  { branch_id: 'BR-HOU-001', branch_name: 'Houston Galleria', region: 'South', city: 'Houston', state: 'TX', manager_name: 'Maria Garcia' },
  { branch_id: 'BR-ATL-001', branch_name: 'Atlanta Midtown', region: 'South', city: 'Atlanta', state: 'GA', manager_name: 'Chris Brown' },
  { branch_id: 'BR-MIA-001', branch_name: 'Miami Beach', region: 'South', city: 'Miami', state: 'FL', manager_name: 'Ana Rodriguez' },
  { branch_id: 'BR-LAX-001', branch_name: 'Downtown LA', region: 'West', city: 'Los Angeles', state: 'CA', manager_name: 'Kevin Park' },
  { branch_id: 'BR-LAX-002', branch_name: 'Beverly Hills', region: 'West', city: 'Beverly Hills', state: 'CA', manager_name: 'Rachel Kim' },
  { branch_id: 'BR-SFO-001', branch_name: 'San Francisco FiDi', region: 'West', city: 'San Francisco', state: 'CA', manager_name: 'Tom Anderson' },
  { branch_id: 'BR-SEA-001', branch_name: 'Seattle Downtown', region: 'West', city: 'Seattle', state: 'WA', manager_name: 'Lisa Thompson' },
  { branch_id: 'BR-DEN-001', branch_name: 'Denver Central', region: 'West', city: 'Denver', state: 'CO', manager_name: 'Mark Johnson' }
];

/**
 * Generate customer data with intentional quality issues
 */
export interface GeneratedCustomer {
  customer_id: string;
  full_name: string;
  first_name: string;
  last_name: string;
  email: string;
  email_valid: boolean;
  phone: string;
  phone_valid: boolean;
  phone_normalized: string | null;
  city: string;
  state: string;
  segment_id: string | null;
  segment_name: string | null;
}

export function generateCustomers(count: number): GeneratedCustomer[] {
  const customers: GeneratedCustomer[] = [];

  for (let i = 0; i < count; i++) {
    const firstName = pick(FIRST_NAMES);
    const lastName = pick(LAST_NAMES);
    const location = pick(CITIES);

    // 15% invalid phones - intentional quality issue
    const hasValidPhone = seededRandom() > 0.15;
    let phone: string;
    let phoneNormalized: string | null = null;

    if (hasValidPhone) {
      const areaCode = randomInt(200, 999);
      const exchange = randomInt(200, 999);
      const subscriber = randomInt(1000, 9999);
      phone = `(${areaCode}) ${exchange}-${subscriber}`;
      phoneNormalized = `+1${areaCode}${exchange}${subscriber}`;
    } else {
      // Various bad phone formats for demo
      const badFormats = [
        `BAD-${i}`,
        '555-0000',
        'INVALID',
        '123',
        `${randomInt(100, 999)}-${randomInt(100, 999)}`,
        ''
      ];
      phone = pick(badFormats);
    }

    // 8% invalid emails - intentional quality issue
    const hasValidEmail = seededRandom() > 0.08;
    let email: string;

    if (hasValidEmail) {
      const domain = pick(EMAIL_DOMAINS);
      email = `${firstName.toLowerCase()}.${lastName.toLowerCase()}${randomInt(1, 999)}@${domain}`;
    } else {
      // Bad email formats
      const badEmails = [
        `not-an-email-${i}`,
        `${firstName}${lastName}`,
        '@nodomain.com',
        'missing@',
        ''
      ];
      email = pick(badEmails);
    }

    // 3% missing segments - intentional quality issue
    const hasSegment = seededRandom() > 0.03;
    const segment = hasSegment ? pick(CUSTOMER_SEGMENTS) : null;

    customers.push({
      customer_id: `CUST-${String(i + 1).padStart(6, '0')}`,
      full_name: `${firstName} ${lastName}`,
      first_name: firstName,
      last_name: lastName,
      email,
      email_valid: hasValidEmail,
      phone,
      phone_valid: hasValidPhone,
      phone_normalized: phoneNormalized,
      city: location.city,
      state: location.state,
      segment_id: segment?.segment_id ?? null,
      segment_name: segment?.segment_name ?? null
    });
  }

  return customers;
}

/**
 * Generate transactions for a date range
 */
export interface GeneratedTransaction {
  transaction_id: string;
  account_id: string;
  customer_id: string;
  transaction_date: string;
  amount: number;
  transaction_type: string;
  branch_id: string;
  branch_name: string | null;
  region: string | null;
  description: string;
}

export function generateTransactions(
  startDate: Date,
  endDate: Date,
  customerIds: string[],
  options: {
    baseTransactionsPerDay?: number;
    includeUnknownBranch?: boolean;
    anomalyDate?: string;
    anomalyMultiplier?: number;
  } = {}
): GeneratedTransaction[] {
  const {
    baseTransactionsPerDay = 500,
    includeUnknownBranch = true,
    anomalyDate,
    anomalyMultiplier = 10
  } = options;

  const transactions: GeneratedTransaction[] = [];
  const currentDate = new Date(startDate);
  let txnCounter = 0;

  while (currentDate <= endDate) {
    const dateStr = currentDate.toISOString().split('T')[0];

    // Vary daily transaction count (normal distribution simulation)
    const variance = (seededRandom() - 0.5) * 0.4;
    const dailyCount = Math.floor(baseTransactionsPerDay * (1 + variance));

    // Weekend has fewer transactions
    const dayOfWeek = currentDate.getDay();
    const weekendMultiplier = (dayOfWeek === 0 || dayOfWeek === 6) ? 0.3 : 1;
    const adjustedCount = Math.floor(dailyCount * weekendMultiplier);

    for (let i = 0; i < adjustedCount; i++) {
      const txnType = pick(TRANSACTION_TYPES);

      // 2% chance of unknown branch - intentional reference data issue
      let branch: typeof BRANCHES[0] | null = null;
      let branchId: string;

      if (includeUnknownBranch && seededRandom() < 0.02) {
        branchId = 'BR-UNKNOWN-001';
      } else {
        branch = pick(BRANCHES);
        branchId = branch.branch_id;
      }

      // Generate realistic amounts based on transaction type
      let amount: number;
      switch (txnType) {
        case 'deposit':
          amount = randomFloat(100, 15000);
          break;
        case 'withdrawal':
          amount = randomFloat(20, 2000);
          break;
        case 'transfer':
          amount = randomFloat(50, 10000);
          break;
        case 'payment':
          amount = randomFloat(25, 5000);
          break;
        case 'fee':
          amount = randomFloat(5, 50);
          break;
        case 'interest':
          amount = randomFloat(1, 500);
          break;
        default:
          amount = randomFloat(10, 1000);
      }

      // Apply anomaly if this is the anomaly date
      if (anomalyDate && dateStr === anomalyDate && txnType === 'deposit') {
        amount = amount * anomalyMultiplier;
      }

      const customerId = pick(customerIds);

      transactions.push({
        transaction_id: `TXN-${dateStr.replace(/-/g, '')}-${String(txnCounter++).padStart(6, '0')}`,
        account_id: `ACC-${customerId.split('-')[1]}`,
        customer_id: customerId,
        transaction_date: dateStr,
        amount: Number(amount.toFixed(2)),
        transaction_type: txnType,
        branch_id: branchId,
        branch_name: branch?.branch_name ?? null,
        region: branch?.region ?? null,
        description: pick(TRANSACTION_DESCRIPTIONS[txnType] || ['Transaction'])
      });
    }

    currentDate.setDate(currentDate.getDate() + 1);
  }

  return transactions;
}

/**
 * Calculate daily revenue from transactions
 */
export interface DailyRevenue {
  date: string;
  total_revenue: number;
  interest_income: number;
  fee_income: number;
  transaction_count: number;
  avg_transaction_value: number;
  revenue_target: number;
  variance_to_target: number;
}

export function calculateDailyRevenue(transactions: GeneratedTransaction[]): DailyRevenue[] {
  // Group by date
  const byDate = new Map<string, GeneratedTransaction[]>();

  for (const txn of transactions) {
    const existing = byDate.get(txn.transaction_date) || [];
    existing.push(txn);
    byDate.set(txn.transaction_date, existing);
  }

  const revenue: DailyRevenue[] = [];
  const dailyTarget = 2500000; // $2.5M daily target

  for (const [date, txns] of byDate) {
    const interestTxns = txns.filter(t => t.transaction_type === 'interest');
    const feeTxns = txns.filter(t => t.transaction_type === 'fee');

    // Revenue comes from fees and a percentage of other transactions
    const interestIncome = interestTxns.reduce((sum, t) => sum + t.amount, 0);
    const feeIncome = feeTxns.reduce((sum, t) => sum + t.amount, 0);
    const transactionRevenue = txns
      .filter(t => !['interest', 'fee'].includes(t.transaction_type))
      .reduce((sum, t) => sum + t.amount * 0.002, 0); // 0.2% of transaction value

    const totalRevenue = interestIncome + feeIncome + transactionRevenue;
    const totalAmount = txns.reduce((sum, t) => sum + t.amount, 0);

    revenue.push({
      date,
      total_revenue: Number(totalRevenue.toFixed(2)),
      interest_income: Number(interestIncome.toFixed(2)),
      fee_income: Number(feeIncome.toFixed(2)),
      transaction_count: txns.length,
      avg_transaction_value: Number((totalAmount / txns.length).toFixed(2)),
      revenue_target: dailyTarget,
      variance_to_target: Number((totalRevenue - dailyTarget).toFixed(2))
    });
  }

  return revenue.sort((a, b) => a.date.localeCompare(b.date));
}

/**
 * Calculate branch metrics from transactions
 */
export interface BranchMetrics {
  date: string;
  branch_id: string;
  branch_name: string | null;
  region: string | null;
  transaction_count: number;
  total_amount: number;
  avg_transaction_value: number;
  customer_count: number;
}

export function calculateBranchMetrics(transactions: GeneratedTransaction[]): BranchMetrics[] {
  // Group by date and branch
  const byDateBranch = new Map<string, GeneratedTransaction[]>();

  for (const txn of transactions) {
    const key = `${txn.transaction_date}|${txn.branch_id}`;
    const existing = byDateBranch.get(key) || [];
    existing.push(txn);
    byDateBranch.set(key, existing);
  }

  const metrics: BranchMetrics[] = [];

  for (const [key, txns] of byDateBranch) {
    const [date, branchId] = key.split('|');
    const totalAmount = txns.reduce((sum, t) => sum + t.amount, 0);
    const uniqueCustomers = new Set(txns.map(t => t.customer_id)).size;

    metrics.push({
      date,
      branch_id: branchId,
      branch_name: txns[0].branch_name,
      region: txns[0].region,
      transaction_count: txns.length,
      total_amount: Number(totalAmount.toFixed(2)),
      avg_transaction_value: Number((totalAmount / txns.length).toFixed(2)),
      customer_count: uniqueCustomers
    });
  }

  return metrics.sort((a, b) => a.date.localeCompare(b.date) || a.branch_id.localeCompare(b.branch_id));
}

/**
 * Generate date range helper
 */
export function getDateRange(daysBack: number): { start: Date; end: Date } {
  const end = new Date();
  end.setHours(0, 0, 0, 0);

  const start = new Date(end);
  start.setDate(start.getDate() - daysBack);

  return { start, end };
}

// Loan types and statuses
const LOAN_TYPES = [
  { type: 'mortgage', minAmount: 100000, maxAmount: 1000000, termMonths: [180, 240, 360], rate: [3.5, 7.5] },
  { type: 'auto', minAmount: 10000, maxAmount: 75000, termMonths: [36, 48, 60, 72], rate: [4.5, 12.0] },
  { type: 'personal', minAmount: 1000, maxAmount: 50000, termMonths: [12, 24, 36, 48, 60], rate: [6.0, 24.0] },
  { type: 'business', minAmount: 25000, maxAmount: 500000, termMonths: [12, 24, 36, 60, 84], rate: [5.0, 15.0] },
  { type: 'student', minAmount: 5000, maxAmount: 100000, termMonths: [120, 180, 240], rate: [3.0, 8.0] },
  { type: 'home_equity', minAmount: 20000, maxAmount: 250000, termMonths: [60, 120, 180], rate: [4.0, 10.0] }
];

const LOAN_STATUSES = [
  { status: 'Current', weight: 0.75 },
  { status: 'Delinquent 30', weight: 0.10 },
  { status: 'Delinquent 60', weight: 0.05 },
  { status: 'Delinquent 90+', weight: 0.03 },
  { status: 'Default', weight: 0.02 },
  { status: 'Paid Off', weight: 0.05 }
];

const LOAN_PURPOSES: Record<string, string[]> = {
  mortgage: ['Primary Residence', 'Investment Property', 'Vacation Home', 'Refinance'],
  auto: ['New Vehicle', 'Used Vehicle', 'Refinance'],
  personal: ['Debt Consolidation', 'Home Improvement', 'Medical Expenses', 'Major Purchase', 'Other'],
  business: ['Working Capital', 'Equipment', 'Expansion', 'Inventory', 'Real Estate'],
  student: ['Undergraduate', 'Graduate', 'Professional', 'Refinance'],
  home_equity: ['Home Improvement', 'Debt Consolidation', 'Major Purchase', 'Education']
};

/**
 * Generated Loan interface
 */
export interface GeneratedLoan {
  loan_id: string;
  customer_id: string;
  loan_type: string;
  principal_amount: number;
  interest_rate: number;
  term_months: number;
  origination_date: string;
  maturity_date: string;
  outstanding_balance: number;
  monthly_payment: number;
  status: string;
  days_past_due: number;
  last_payment_date: string | null;
  next_payment_date: string | null;
  purpose: string;
  collateral_value: number | null;
  branch_id: string;
}

/**
 * Generate loans with intentional quality issues
 */
export function generateLoans(
  customerIds: string[],
  options: {
    loansPerCustomer?: number;
    includeQualityIssues?: boolean;
  } = {}
): GeneratedLoan[] {
  const {
    loansPerCustomer = 0.4, // 40% of customers have loans
    includeQualityIssues = true
  } = options;

  const loans: GeneratedLoan[] = [];
  let loanCounter = 0;

  // Determine which customers get loans
  const customersWithLoans = Math.floor(customerIds.length * loansPerCustomer);
  const shuffledCustomers = [...customerIds].sort(() => seededRandom() - 0.5);
  const loanCustomers = shuffledCustomers.slice(0, customersWithLoans);

  for (const customerId of loanCustomers) {
    // Some customers have multiple loans (20% chance)
    const loanCount = seededRandom() < 0.2 ? randomInt(2, 3) : 1;

    for (let i = 0; i < loanCount; i++) {
      const loanType = pick(LOAN_TYPES);
      const principal = randomFloat(loanType.minAmount, loanType.maxAmount, 0);
      const rate = randomFloat(loanType.rate[0], loanType.rate[1], 2);
      const termMonths = pick(loanType.termMonths);

      // Calculate monthly payment (simplified formula)
      const monthlyRate = rate / 100 / 12;
      const monthlyPayment = principal * (monthlyRate * Math.pow(1 + monthlyRate, termMonths)) /
                            (Math.pow(1 + monthlyRate, termMonths) - 1);

      // Generate origination date (within last 5 years)
      const today = new Date();
      const maxDaysBack = 5 * 365;
      const daysBack = randomInt(30, maxDaysBack);
      const originationDate = new Date(today);
      originationDate.setDate(originationDate.getDate() - daysBack);

      // Calculate maturity date
      const maturityDate = new Date(originationDate);
      maturityDate.setMonth(maturityDate.getMonth() + termMonths);

      // Determine status based on weighted random
      let status = 'Current';
      let daysPastDue = 0;
      const statusRoll = seededRandom();
      let cumWeight = 0;
      for (const s of LOAN_STATUSES) {
        cumWeight += s.weight;
        if (statusRoll < cumWeight) {
          status = s.status;
          break;
        }
      }

      // Set days past due based on status
      switch (status) {
        case 'Delinquent 30': daysPastDue = randomInt(1, 30); break;
        case 'Delinquent 60': daysPastDue = randomInt(31, 60); break;
        case 'Delinquent 90+': daysPastDue = randomInt(61, 180); break;
        case 'Default': daysPastDue = randomInt(90, 365); break;
        default: daysPastDue = 0;
      }

      // Calculate outstanding balance
      const monthsElapsed = Math.floor(daysBack / 30);
      const paymentsMade = status === 'Paid Off' ? termMonths :
                          Math.max(0, monthsElapsed - Math.floor(daysPastDue / 30));
      let outstandingBalance = principal;

      // Amortization simulation (simplified)
      for (let m = 0; m < paymentsMade; m++) {
        const interestPayment = outstandingBalance * monthlyRate;
        const principalPayment = monthlyPayment - interestPayment;
        outstandingBalance = Math.max(0, outstandingBalance - principalPayment);
      }

      if (status === 'Paid Off') {
        outstandingBalance = 0;
      }

      // Last payment date
      let lastPaymentDate: string | null = null;
      let nextPaymentDate: string | null = null;

      if (status !== 'Paid Off' && paymentsMade > 0) {
        const lastPayment = new Date(originationDate);
        lastPayment.setMonth(lastPayment.getMonth() + paymentsMade);
        lastPaymentDate = lastPayment.toISOString().split('T')[0];

        const nextPayment = new Date(lastPayment);
        nextPayment.setMonth(nextPayment.getMonth() + 1);
        if (nextPayment <= maturityDate) {
          nextPaymentDate = nextPayment.toISOString().split('T')[0];
        }
      }

      // Collateral value for secured loans
      let collateralValue: number | null = null;
      if (['mortgage', 'auto', 'home_equity'].includes(loanType.type)) {
        // Collateral typically worth more than loan
        collateralValue = Math.round(principal * randomFloat(1.1, 1.5));
      }

      // 5% chance of missing collateral value for secured loans (quality issue)
      if (includeQualityIssues && collateralValue && seededRandom() < 0.05) {
        collateralValue = null;
      }

      // Branch assignment
      let branchId = pick(BRANCHES).branch_id;

      // 3% chance of unknown branch (quality issue)
      if (includeQualityIssues && seededRandom() < 0.03) {
        branchId = 'BR-UNKNOWN-001';
      }

      loans.push({
        loan_id: `LOAN-${String(++loanCounter).padStart(6, '0')}`,
        customer_id: customerId,
        loan_type: loanType.type,
        principal_amount: Math.round(principal),
        interest_rate: rate,
        term_months: termMonths,
        origination_date: originationDate.toISOString().split('T')[0],
        maturity_date: maturityDate.toISOString().split('T')[0],
        outstanding_balance: Math.round(outstandingBalance * 100) / 100,
        monthly_payment: Math.round(monthlyPayment * 100) / 100,
        status,
        days_past_due: daysPastDue,
        last_payment_date: lastPaymentDate,
        next_payment_date: nextPaymentDate,
        purpose: pick(LOAN_PURPOSES[loanType.type] || ['Other']),
        collateral_value: collateralValue,
        branch_id: branchId
      });
    }
  }

  return loans;
}
