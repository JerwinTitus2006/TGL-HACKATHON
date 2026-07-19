with open(r'c:\Users\Jerwin titus\Desktop\Radix\frontend\src\index.css', 'r', encoding='utf-8') as f:
    content = f.read()

import re
keyframes = re.findall(r'@keyframes\s+\w+\s*\{[^}]+\}', content)
print("Keyframes found in CSS:")
for k in keyframes[:10]:
    print(k.strip())
