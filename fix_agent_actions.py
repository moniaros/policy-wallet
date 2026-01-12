import re

file_path = r"c:\Users\admin\Documents\GitHub\PolicyWalletPlatform\New folder\product-plan\policy-wallet\app\(protected)\agent\actions.ts"

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Replace all variations of session checks
content = content.replace('if (!session?.user?.id)', 'if (!authResult)')
content = content.replace('if (!session)', 'if (!authResult)')

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

print("Replacement complete!")
