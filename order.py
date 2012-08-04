import braintree

braintree.Configuration.configure(
    braintree.Environment.Sandbox,
    "the_merchant_id",
    "the_public_key",
    "the_private_key"
)

def order(credit_card, amount, expiration_date, menu_item):
    result = braintree.Transaction.sale({
        "amount": amount,
        "credit_card": {
            "number": credit_card,
            "expiration_date": expiration_date
        }
    })

    if result.is_success:
# save transaction here
        return result.is_success
    elif result.transaction:
# save transaction here
    else:
# save transaction here
