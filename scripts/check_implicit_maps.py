with open(r'c:\Users\Jerwin titus\Desktop\Radix\backend\app\services\scoring_service.py', 'r', encoding='utf-8') as f:
    lines = f.readlines()

for i, line in enumerate(lines):
    if 'IMPLICIT_MAPS' in line:
        print(f"Line {i+1}: {line.strip()}")
