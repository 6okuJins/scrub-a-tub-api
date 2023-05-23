// This is your test secret API key.
const stripe = require('stripe')('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');
const express = require('express');
const app = express();
const cors = require('cors');

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
      tax_rates: ['txr_1N7qzWF1mktuyQCa1ztzi1IA']
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
        tax_rates: ['txr_1N7qzWF1mktuyQCa1ztzi1IA']
      }] : []),

      {
        // add the service type price
        price: (cart.frequency.value == 'weekly' ? cart.serviceType.priceIDWeekly : cart.frequency.value == 'biweekly' ? cart.serviceType.priceIDBiweekly : cart.frequency.value == 'monthly' ? cart.serviceType.priceIDMonthly : cart.serviceType.priceID),
        quantity: 1,
        tax_rates: ['txr_1N7qzWF1mktuyQCa1ztzi1IA']
      },
      {
        // add extra bedrooms price
        price: (cart.frequency.value == 'weekly' ? 'price_1N7oXCF1mktuyQCam1T5iaEX' : cart.frequency.value == 'biweekly' ? 'price_1N7oXCF1mktuyQCakUso2Zgo' : cart.frequency.value == 'monthly' ? 'price_1N7oXCF1mktuyQCasLYNH9r6' :  'price_1N7oXCF1mktuyQCaK7ilR9An'),
        quantity: cart.houseDetails.bedrooms.value,
        tax_rates: ['txr_1N7qzWF1mktuyQCa1ztzi1IA']
      }, // add extra bathrooms price
      ...(cart.houseDetails.bathrooms.value > 0 ? [{
        price: (cart.frequency.value == 'weekly' ? 'price_1N7mS0F1mktuyQCaHdSKqnm0' : cart.frequency.value == 'biweekly' ? 'price_1N7mS0F1mktuyQCacluPKqXo' : cart.frequency.value == 'monthly' ? 'price_1N7mS0F1mktuyQCaZEF17536' :  'price_1N7mS0F1mktuyQCapQkORoZB'),
        quantity: cart.houseDetails.bathrooms.value,
        tax_rates: ['txr_1N7qzWF1mktuyQCa1ztzi1IA']
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
app.get('/api/users', (req, res) => {
  // Logic for fetching users
  res.json({ message: 'Get all users' });
});
app.listen(4242, () => console.log('Running on port 4242'));