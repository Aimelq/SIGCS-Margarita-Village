import bcrypt
print(bcrypt.hashpw(b'pass', bcrypt.gensalt()).decode())
