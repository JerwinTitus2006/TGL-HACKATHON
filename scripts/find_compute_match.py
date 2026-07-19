with open(r'c:\Users\Jerwin titus\Desktop\Radix\backend\app\services\student_service.py', 'r', encoding='utf-8') as f:
    lines = f.readlines()

found = False
for i, line in enumerate(lines):
    if '_compute_match' in line:
        print(f"Line {i+1}: {line.strip()}")
        found = True

if not found:
    print("Not found")
