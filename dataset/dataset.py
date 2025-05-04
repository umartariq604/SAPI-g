import pandas as pd
import numpy as np
import random
from datetime import datetime, timedelta
from tqdm import tqdm

# Configuration
n_samples = 500_000
attack_types = ['BENIGN', 'DDoS', 'PortScan', 'BruteForce', 'XSS', 'SQLi']
weights = [0.7, 0.1, 0.08, 0.05, 0.04, 0.03]

# Generate IPs once to reuse and speed up generation
ip_pool = [f"192.168.{i}.{j}" for i in range(1, 10) for j in range(1, 255)]

# Start timestamp
start_time = datetime(2023, 1, 1, 0, 0, 0)

# Pre-allocate list
data = []

print("⏳ Generating dataset...")
for _ in tqdm(range(n_samples)):
    src_ip = random.choice(ip_pool)
    dst_ip = random.choice(ip_pool)
    flow_id = f"{src_ip}-{dst_ip}-{random.randint(1000, 65000)}-{random.randint(1000, 65000)}"
    
    src_port = random.randint(1024, 65535)
    dst_port = random.randint(20, 443)
    protocol = random.choice([6, 17])  # TCP=6, UDP=17
    timestamp = start_time + timedelta(seconds=random.randint(0, 3600 * 24))
    flow_duration = random.randint(10000, 1000000)

    fwd_packets = random.randint(1, 100)
    bwd_packets = random.randint(1, 100)
    total_fwd_len = fwd_packets * random.randint(40, 1500)
    total_bwd_len = bwd_packets * random.randint(40, 1500)

    fwd_pkt_len_mean = total_fwd_len / fwd_packets
    bwd_pkt_len_mean = total_bwd_len / bwd_packets

    label = random.choices(attack_types, weights)[0]

    data.append([
        flow_id, src_ip, src_port, dst_ip, dst_port, protocol, timestamp, flow_duration,
        fwd_packets, bwd_packets, total_fwd_len, total_bwd_len,
        round(fwd_pkt_len_mean, 2), round(bwd_pkt_len_mean, 2), label
    ])

# Convert to DataFrame
columns = [
    'Flow ID', 'Source IP', 'Source Port', 'Destination IP', 'Destination Port', 'Protocol',
    'Timestamp', 'Flow Duration', 'Total Fwd Packets', 'Total Bwd Packets',
    'Total Length of Fwd Packets', 'Total Length of Bwd Packets',
    'Fwd Packet Length Mean', 'Bwd Packet Length Mean', 'Label'
]
df = pd.DataFrame(data, columns=columns)

# Save as CSV
output_file = "synthetic_CICIDS500k.csv"
df.to_csv(output_file, index=False)
print(f"✅ Done! Dataset saved as: {output_file}")
