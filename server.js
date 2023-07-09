// This is your test secret API key.
require('dotenv').config();
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const express = require('express');
// get and deconstruct the services.test.json file into its component objects
const { taxRateID, serviceType, houseDetails } = require('./services.test.json');
const app = express();
const cors = require('cors');
console.log(process.env.STRIPE_SECRET_KEY);
app.use(cors());
app.use(express.static('public'));

app.use(express.json());
app.post('/api/create-checkout-session', async (req, res) => {
  const { cart } = req.body;
  // TODO: MAKE THIS CONDITIONAL LATER
  const redirectURL = 'https://www.scrubatubclean.ca/';
  
  // take the extras array from cart and return an array of objects with the price id. If the frequency is "biweekly", use the "priceIDBiweekly" prop.
  // If the frequency is "monthly", use the "priceIDMonthly" prop. If the frequency is "weekly", use the "priceIDWeekly" prop. Otherwise, just add the "priceID" prop.
  // Also include quantity prop.
  const extraItems = cart.extras.map((extra) => {
    return {
      price: cart.frequency.value == 'biweekly' ? extra.priceIDBiweekly : cart.frequency.value == 'monthly' ? extra.priceIDMonthly : cart.frequency.value == 'weekly' ? extra.priceIDWeekly : extra.priceID,
      quantity: (extra?.quantity || 1),
      tax_rates: [taxRateID]
    }
  });
  const totalFullPrice = (cart.serviceType.price + cart.extras.reduce((acc, item) => acc + item.price * (item.quantity || 1), 0) + (cart.houseDetails.bedrooms?.price || 0) + (cart.houseDetails.bathrooms?.price || 0))*100;
  const calculateCoupon = () => {
    const numBeds = cart.houseDetails.bedrooms.value;
    const numBaths = cart.houseDetails.bathrooms.value;
    console.log(numBeds, numBaths);
    if ( numBeds + numBaths > 3 ) {
      console.log('more than 3');
      if ( numBeds == 1 || numBaths == 1 ) {
        console.log(4);
        return 4;
      } else if ( numBeds == 2 || numBaths == 2 ) {
        console.log(5);
        return 5;
      } else if ( Math.min(numBeds,numBaths) >= 3 ) {
        console.log(6);
        return 6;
      }
    }
    return 3;
  }
  const session = await stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    
    // add meta data including cart.date.startTime, cart.date.endTime, cart.date.date, cart.misc.arrivalTimeFlexibility, cart.misc.homeEntranceMethod, cart.misc.cleanlinessRating, cart.misc.preferredTechnician, cart.misc.parkingInstructions, cart.misc.specialInstructions
    [`${cart.frequency.value == 'once' ? "payment_intent_data" : "subscription_data"}`]: {
      metadata: {
      "earliestArrival": cart.date.earliestArrival,
      "latestArrival": cart.date.latestArrival,
      "arrivalTimeFlexibility": cart.misc?.arrivalTimeFlexibility?.value,
      "homeEntranceMethod": cart.misc?.homeEntranceMethod?.value,
      "cleanlinessRating": cart.misc?.cleanlinessRating?.value,
      "preferredTechnician": cart.misc?.preferredTechnician?.value,
      "parkingInstructions": cart.misc?.parkingInstructions,
      "specialInstructions": cart.specialInstructions
      }
    },
    line_items: [...(cart.frequency.value != 'once' ? 
      [{
        // create a new price object that is 10% of the total price
        price_data: {
          currency: 'cad',
          product_data: {
            name: 'First Billing Cycle',
          },
          unit_amount: Math.round(totalFullPrice/10),
        },
        quantity: 1,
        tax_rates: [taxRateID]
      }] : []),

      {
        // add the service type price
        price: (cart.frequency.value == 'weekly' ? cart.serviceType.priceIDWeekly : cart.frequency.value == 'biweekly' ? cart.serviceType.priceIDBiweekly : cart.frequency.value == 'monthly' ? cart.serviceType.priceIDMonthly : cart.serviceType.priceID),
        quantity: 1,
        tax_rates: [taxRateID]
      },
      {
        // add extra bedrooms price
        price: (cart.frequency.value == 'weekly' ? houseDetails.bedrooms.priceIDWeekly : cart.frequency.value == 'biweekly' ? houseDetails.bedrooms.priceIDBiweekly : cart.frequency.value == 'monthly' ? houseDetails.bedrooms.priceIDMonthly :  houseDetails.bedrooms.priceID),
        quantity: cart.houseDetails.bedrooms.value,
        tax_rates: [taxRateID]
      }, // add extra bathrooms price
      ...(cart.houseDetails.bathrooms.value > 0 ? [{
        price: (cart.frequency.value == 'weekly' ? houseDetails.bathrooms.priceIDWeekly : cart.frequency.value == 'biweekly' ? houseDetails.bathrooms.priceIDBiweekly : cart.frequency.value == 'monthly' ? houseDetails.bathrooms.priceIDMonthly :  houseDetails.bathrooms.priceID),
        quantity: cart.houseDetails.bathrooms.value,
        tax_rates: [taxRateID]
      }] : []),
    ].concat(extraItems),
    discounts: (cart.frequency.value == 'once' ? [{
      coupon:`bedbath${calculateCoupon()}`,
    }] : []),
    mode: cart.frequency.value == 'once' ? 'payment' : 'subscription',
    success_url: redirectURL + '?status=success',
    cancel_url: redirectURL + '?status=cancel',
    customer_email: cart.clientInfo.email
  });

  res.json({ id: session.id });
});
app.post('/stripe-webhook', express.raw({type: 'application/json'}), (request, response) => {
  const sig = request.headers['stripe-signature'];

  let event;

  try {
    event = stripe.webhooks.constructEvent(request.body, sig, endpointSecret);
  } catch (err) {
    response.status(400).send(`Webhook Error: ${err.message}`);
    return;
  }

  // Handle the event
  switch (event.type) {
    case 'payment_intent.succeeded':
      const paymentIntentSucceeded = event.data.object;
      // Then define and call a function to handle the event payment_intent.succeeded
      break;
    // ... handle other event types
    default:
      console.log(`Unhandled event type ${event.type}`);
  }

  // Return a 200 response to acknowledge receipt of the event
  response.send();
});
app.get('/api/users', (req, res) => {
  // Logic for fetching users
  res.json({ message: 'Get all users' });
});
app.listen(process.env.PORT, () => console.log(process.env.PORT));