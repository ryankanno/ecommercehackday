import braintree


def charge_order(merchant_id, pub_key, priv_key, credit_card, amount, expiration_date):

    braintree.Configuration.configure(
        braintree.Environment.Sandbox,
        merchant_id,
        pub_key,
        priv_key
    )

    result = braintree.Transaction.sale({
        "amount": amount,
        "credit_card": {
            "number": credit_card,
            "expiration_date": expiration_date
        }
    })

    if result.is_success:
        return result.is_success
    elif result.transaction:
        return False
    else:
        return False
