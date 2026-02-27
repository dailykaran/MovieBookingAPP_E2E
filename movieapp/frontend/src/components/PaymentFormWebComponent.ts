/**
 * PaymentForm Web Component with Shadow DOM
 * Secure, encapsulated payment form component
 * Prevents style leakage and XSS attacks
 */

interface PaymentDetails {
  cardholderName: string;
  cardNumber: string;
  expiryMonth: string;
  expiryYear: string;
  cvv: string;
  amount: number;
  currency: string;
}

class PaymentFormElement extends HTMLElement {
  private shadow: ShadowRoot;
  private formData: Partial<PaymentDetails> = {};
  private amount: number = 0;
  private currency: string = 'INR';

  constructor() {
    super();
    this.shadow = this.attachShadow({ mode: 'open' });
  }

  connectedCallback() {
    this.amount = parseInt(this.getAttribute('amount') || '0');
    this.currency = this.getAttribute('currency') || 'INR';
    this.renderForm();
  }

  private renderForm() {
    const styles = this.createStyles();

    this.shadow.innerHTML = `
      ${styles}
      <div class="payment-form-container">
        <h2>Payment Details</h2>
        <form class="payment-form" id="payment-form">
          
          <!-- Order Summary -->
          <div class="order-summary">
            <div class="summary-item">
              <span>Amount:</span>
              <strong class=\"amount\">₹${this.amount}</strong>
            </div>
          </div>

          <!-- Cardholder Name -->
          <div class="form-group">
            <label for="cardholder-name">Cardholder Name</label>
            <input
              type="text"
              id="cardholder-name"
              name="cardholderName"
              placeholder="John Doe"
              required
              autocomplete="cc-name"
            />
            <span class="error-message" id="cardholderName-error"></span>
          </div>

          <!-- Card Number -->
          <div class="form-group">
            <label for="card-number">Card Number</label>
            <input
              type="text"
              id="card-number"
              name="cardNumber"
              placeholder="1234 5678 9012 3456"
              maxlength="19"
              required
              autocomplete="cc-number"
              inputmode="numeric"
            />
            <span class="card-type-icon" id="card-type"></span>
            <span class="error-message" id="cardNumber-error"></span>
          </div>

          <!-- Expiry & CVV -->
          <div class="form-row">
            <div class="form-group">
              <label for="expiry-month">Expiry Month</label>
              <select id="expiry-month" name="expiryMonth" required autocomplete="cc-exp-month">
                <option value="">Month</option>
                ${Array.from({ length: 12 }, (_, i) => {
                  const month = String(i + 1).padStart(2, '0');
                  return `<option value="${month}">${month}</option>`;
                }).join('')}
              </select>
              <span class="error-message" id="expiryMonth-error"></span>
            </div>

            <div class="form-group">
              <label for="expiry-year">Expiry Year</label>
              <select id="expiry-year" name="expiryYear" required autocomplete="cc-exp-year">
                <option value="">Year</option>
                ${Array.from({ length: 10 }, (_, i) => {
                  const year = new Date().getFullYear() + i;
                  return `<option value="${year}">${year}</option>`;
                }).join('')}
              </select>
              <span class="error-message" id="expiryYear-error"></span>
            </div>

            <div class="form-group">
              <label for="cvv">CVV</label>
              <input
                type="password"
                id="cvv"
                name="cvv"
                placeholder="123"
                maxlength="4"
                required
                autocomplete="cc-csc"
                inputmode="numeric"
              />
              <span class="error-message" id="cvv-error"></span>
            </div>
          </div>

          <!-- Terms & Conditions -->
          <div class="form-group checkbox">
            <input type="checkbox" id="terms" name="terms" required />
            <label for="terms">I agree to the terms and conditions</label>
            <span class="error-message" id="terms-error"></span>
          </div>

          <!-- Security Notice -->
          <div class="security-notice">
            🔒 Your payment information is encrypted and secure
          </div>

          <!-- Submit Button -->
          <button type="submit" class="submit-btn">
            Pay ₹${this.amount}
          </button>

          <!-- Cancel Button -->
          <button type="button" class="cancel-btn">Cancel</button>
        </form>
      </div>
    `;

    this.attachFormEventListeners();
  }

  private createStyles(): string {
    return `
      <style>
        :host {
          --primary-color: #1976d2;
          --error-color: #f44336;
          --success-color: #4caf50;
          --border-color: #ddd;
          --text-primary: #333;
          --text-secondary: #666;
        }

        .payment-form-container {
          background: white;
          border-radius: 8px;
          padding: 32px;
          max-width: 500px;
          margin: 20px auto;
          box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
          font-family: 'Roboto', sans-serif;
        }

        h2 {
          color: var(--primary-color);
          margin: 0 0 24px 0;
          text-align: center;
          font-size: 1.5em;
        }

        .payment-form {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .order-summary {
          background: #f5f5f5;
          padding: 16px;
          border-radius: 6px;
          border-left: 4px solid var(--primary-color);
        }

        .summary-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 1.1em;
          color: var(--text-primary);
        }

        .summary-item .amount {
          color: var(--primary-color);
          font-size: 1.2em;
        }

        .form-group {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .form-group.checkbox {
          flex-direction: row;
          align-items: center;
          gap: 12px;
        }

        label {
          font-weight: 600;
          color: var(--text-primary);
          font-size: 0.95em;
        }

        input[type="text"],
        input[type="password"],
        select {
          padding: 12px;
          border: 1px solid var(--border-color);
          border-radius: 4px;
          font-size: 1em;
          font-family: 'Roboto Mono', monospace;
          transition: border-color 0.2s;
          background: white;
          color: var(--text-primary);
        }

        input[type="text"]:focus,
        input[type="password"]:focus,
        select:focus {
          outline: none;
          border-color: var(--primary-color);
          box-shadow: 0 0 0 2px rgba(25, 118, 210, 0.1);
        }

        input[type="checkbox"] {
          width: 18px;
          height: 18px;
          cursor: pointer;
          accent-color: var(--primary-color);
        }

        input[type="checkbox"] + label {
          font-weight: normal;
          cursor: pointer;
        }

        .form-row {
          display: grid;
          grid-template-columns: 1fr 1fr 1fr;
          gap: 12px;
        }

        .card-type-icon {
          position: absolute;
          right: 12px;
          top: 50%;
          transform: translateY(-50%);
          font-size: 1.5em;
        }

        .error-message {
          color: var(--error-color);
          font-size: 0.85em;
          display: none;
        }

        .error-message.show {
          display: block;
        }

        input.error,
        select.error {
          border-color: var(--error-color);
          background-color: #ffebee;
        }

        .security-notice {
          background: #e8f5e9;
          color: var(--success-color);
          padding: 12px;
          border-radius: 4px;
          text-align: center;
          font-size: 0.9em;
          font-weight: 500;
          border-left: 4px solid var(--success-color);
        }

        .submit-btn,
        .cancel-btn {
          padding: 12px 24px;
          border: none;
          border-radius: 4px;
          font-size: 1em;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }

        .submit-btn {
          background: var(--primary-color);
          color: white;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .submit-btn:hover {
          background: #1565c0;
          box-shadow: 0 4px 12px rgba(25, 118, 210, 0.3);
        }

        .submit-btn:active {
          transform: scale(0.98);
        }

        .submit-btn:disabled {
          background: #ccc;
          cursor: not-allowed;
          opacity: 0.6;
        }

        .cancel-btn {
          background: #f5f5f5;
          color: var(--text-primary);
          border: 1px solid var(--border-color);
        }

        .cancel-btn:hover {
          background: #eeeeee;
        }

        @media (max-width: 480px) {
          .payment-form-container {
            padding: 16px;
          }

          .form-row {
            grid-template-columns: 1fr;
          }

          h2 {
            font-size: 1.3em;
          }
        }
      </style>
    `;
  }

  private attachFormEventListeners() {
    const form = this.shadow?.querySelector('form') as HTMLFormElement;
    const cardNumberInput = this.shadow?.querySelector('#card-number') as HTMLInputElement;
    const cancelBtn = this.shadow?.querySelector('.cancel-btn') as HTMLButtonElement;

    if (form) {
      form.addEventListener('submit', (e) => this.handleSubmit(e));
    }

    if (cardNumberInput) {
      cardNumberInput.addEventListener('input', (e) => this.handleCardNumberInput(e));
    }

    if (cancelBtn) {
      cancelBtn.addEventListener('click', () => {
        this.dispatchEvent(new CustomEvent('payment-cancelled', {
          bubbles: true,
          composed: true
        }));
      });
    }
  }

  private handleCardNumberInput(e: Event) {
    const input = e.target as HTMLInputElement;
    let value = input.value.replace(/\s+/g, '');
    
    // Only keep numbers
    value = value.replace(/\D/g, '');
    
    // Limit to 19 digits max (some cards can be longer)
    if (value.length > 19) {
      value = value.slice(0, 19);
    }
    
    // Format as card number (1234 5678 9012 3456)
    const formatted = value.replace(/(\d{4})(?=\d)/g, '$1 ');
    input.value = formatted;

    // Detect card type
    const cardType = this.detectCardType(value);
    const typeIcon = this.shadow?.querySelector('#card-type');
    if (typeIcon) {
      typeIcon.textContent = cardType.icon;
    }
    
    // Clear error when user is typing valid number
    const errorElement = this.shadow?.querySelector('#cardNumber-error');
    if (errorElement && value.length >= 13 && value.length <= 19 && /^\d+$/.test(value)) {
      errorElement.classList.remove('show');
      errorElement.textContent = '';
      input.classList.remove('error');
    }
  }

  private detectCardType(cardNumber: string): { type: string; icon: string } {
    const patterns: Record<string, { regex: RegExp; icon: string }> = {
      visa: { regex: /^4[0-9]{12}(?:[0-9]{3})?$/, icon: '💳 Visa' },
      mastercard: { regex: /^5[1-5][0-9]{14}$/, icon: '💳 Mastercard' },
      amex: { regex: /^3[47][0-9]{13}$/, icon: '💳 Amex' },
      discover: { regex: /^6(?:011|5[0-9]{2})[0-9]{12}$/, icon: '💳 Discover' }
    };

    for (const [type, { regex, icon }] of Object.entries(patterns)) {
      if (regex.test(cardNumber)) {
        return { type, icon };
      }
    }

    return { type: 'unknown', icon: '💳' };
  }

  private handleSubmit(e: Event) {
    e.preventDefault();
    
    if (this.validateForm()) {
      const form = this.shadow?.querySelector('form') as HTMLFormElement;
      const formData = new FormData(form);

      this.formData = {
        cardholderName: formData.get('cardholderName') as string,
        cardNumber: formData.get('cardNumber') as string,
        expiryMonth: formData.get('expiryMonth') as string,
        expiryYear: formData.get('expiryYear') as string,
        cvv: formData.get('cvv') as string,
        amount: this.amount,
        currency: this.currency
      };

      this.dispatchEvent(new CustomEvent('payment-submitted', {
        detail: this.formData,
        bubbles: true,
        composed: true
      }));
    }
  }

  private validateForm(): boolean {
    const form = this.shadow?.querySelector('form') as HTMLFormElement;
    const inputs = form.querySelectorAll('input, select');
    let isValid = true;

    inputs.forEach(input => {
      const inputElement = input as HTMLInputElement | HTMLSelectElement;
      const errorElement = this.shadow?.querySelector(`#${inputElement.name}-error`);
      let fieldIsValid = true;
      let errorMsg = '';

      // Custom validation for card number
      if (inputElement.name === 'cardNumber') {
        const cardNum = inputElement.value.replace(/\s/g, '').trim();
        if (!cardNum) {
          fieldIsValid = false;
          errorMsg = 'Card number is required';
        } else if (!/^\d+$/.test(cardNum)) {
          // Check format first - only digits allowed
          fieldIsValid = false;
          errorMsg = 'Card number must contain only digits';
        } else if (cardNum.length < 13 || cardNum.length > 19) {
          // Standard credit card length is 13-19 digits
          fieldIsValid = false;
          errorMsg = `Card number must be 13-19 digits (you entered ${cardNum.length})`;
        }
      } else if (!inputElement.checkValidity()) {
        fieldIsValid = false;
      }

      if (!fieldIsValid) {
        inputElement.classList.add('error');
        if (errorElement) {
          errorMsg = errorMsg || this.getErrorMessage(inputElement);
          errorElement.textContent = errorMsg;
          errorElement.classList.add('show');
        }
        isValid = false;
      } else {
        inputElement.classList.remove('error');
        if (errorElement) {
          errorElement.classList.remove('show');
        }
      }
    });

    return isValid;
  }

  private getErrorMessage(input: HTMLInputElement | HTMLSelectElement): string {
    const name = input.name;
    if (!input.value) return `${name} is required`;
    
    switch (name) {
      case 'cardNumber':
        const cardNum = input.value.replace(/\s/g, '').trim();
        if (!/^\d+$/.test(cardNum)) return 'Card number must contain only digits';
        if (cardNum.length < 13 || cardNum.length > 19) {
          return `Card number must be 13-19 digits (you entered ${cardNum.length})`;
        }
        return 'Invalid card number';
      case 'cvv':
        return 'CVV must be 3-4 digits';
      default:
        return 'This field is invalid';
    }
  }

  // Public method: Get form data
  getFormData(): Partial<PaymentDetails> {
    return this.formData;
  }

  // Public method: Reset form
  resetForm() {
    const form = this.shadow?.querySelector('form') as HTMLFormElement;
    if (form) form.reset();
    this.formData = {};
  }
}

if (!customElements.get('payment-form')) {
  customElements.define('payment-form', PaymentFormElement);
}

export default PaymentFormElement;
