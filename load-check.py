import requests

number_of_requests = 10000

def check():
    pods = dict()
    for i in range(number_of_requests):
        r = requests.get("http://192.168.49.2:30363/definition?word=matin")
        pod_name = r.json()['pod']
        if (not pod_name in pods):
            pods[pod_name] = 1
        else :
            pods[pod_name] += 1
    print(f"[+] Number of requests sent: {number_of_requests}")
    for key in pods:
        print(f"[+] {key} answered {pods[key]} of them.")

check()