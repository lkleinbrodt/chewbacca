from setuptools import setup, find_packages

setup(
    name='chewbacca',
    version='0.3',
    packages=find_packages(),
    install_requires = [
        'openai',
        'python-dotenv'
    ],
    entry_points={
        'console_scripts': [
            'chewbacca-document = src.document:main',
        ],
    },
)
