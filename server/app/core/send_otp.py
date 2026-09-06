import requests




async def send_otp(email: str, otp: str) -> None:
    try:


        worker_url="https://empty-bar-b59a.ajaysingh131629.workers.dev"
        headers = {"Accept": "application/json"}
        
        res=requests.post(worker_url, json={"email": email, "otp": otp}, headers=headers)
        res.raise_for_status()
        print(f"Sending OTP {otp} to email {email}")
        # Add actual sending logic here
    except requests.exceptions.HTTPError as e:
        raise Exception(f"Failed to send OTP: {e}")