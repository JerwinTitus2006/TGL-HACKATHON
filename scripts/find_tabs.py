with open(r'c:\Users\Jerwin titus\Desktop\Radix\frontend\src\App.tsx', 'r', encoding='utf-8') as f:
    lines = f.readlines()

for i, line in enumerate(lines):
    if 'tab' in line.lower() or 'bench' in line.lower():
        if any(term in line for term in ['const [', 'state', 'setCurrentTab', 'activeTab', 'currentTab']):
            print(f"Line {i+1}: {line.strip()}")
