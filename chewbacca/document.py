import ast
import openai
import os
import time
import dotenv
import subprocess
import os
import fnmatch

dotenv.load_dotenv()
openai.api_key = os.getenv("OPENAI_API_KEY")
import ast


def extract_functions(file_path, exclude_docstrings=True):
    """Extracts all functions from a Python file and returns a list of `ast.FunctionDef` objects.

    Args:
        file_path (str): The path to the Python file to extract functions from.
        exclude_docstrings (bool, optional): If True, excludes functions with docstrings. Defaults to True.

    Returns:
        list: A list of `ast.FunctionDef` objects representing each function found in the file.

    This function opens a Python file, parses it using the Abstract Syntax Trees (AST) library and returns a list of `ast.FunctionDef` objects, which contain information about the function signature and body. If `exclude_docstrings` is True (default), functions with docstrings will be excluded from the returned list. This function does not execute or import the Python code.
    """
    with open(file_path, "r") as file:
        source = file.read()
    module = ast.parse(source)
    functions = [node for node in module.body if isinstance(node, ast.FunctionDef)]
    if exclude_docstrings:
        functions = [
            function for function in functions if not ast.get_docstring(function)
        ]
    return functions


def format_docstring(docstring):
    """Format a docstring to comply with PEP conventions.

    The function takes a multiline docstring as
        its input and removes the double quotes.
    It then breaks the docstring into lines of no more than 80
        characters, with subsequent
    lines prefixed by a tab character to visually match the rest of the
        docstring.

    Args:
    docstring (str): a multiline string containing the existing docstring.


           Returns:
    str: the formatted docstring, which conforms to PEP conventions.

    """
    docstring = docstring.replace('"""', "")
    formatted_docstring = '"""'
    l = docstring.split(" ")
    c = 0
    while l:
        word = l.pop(0)
        formatted_docstring += word + " "
        c += len(word)
        if c > 80:
            formatted_docstring += "\n" #should it be \n\t?
            c = 0
    formatted_docstring += '\n\t"""'
    return formatted_docstring


def generate_docstring(function_string: str, attempts=0):
    """Generate a concise and informative docstring for the given function string following PEP conventions.


    Args:
        function_string (str): The string representation of the function for which the docstring
        is being generated.
        attempts (int, optional): The number of times generate_docstring() has been
        attempted. Default is 0.

    Returns:
        A string containing the concise and informative docstring
        for the given function.

    Raises:
        ConnectionResetError: If there is a connection reset error
        when trying to generate the docstring.
        RateLimitError: If the API rate limit is breached, it waits
        20 seconds and attempts again. If it is still breaching, it raises this error.

    """
    context_prompt = "You are an expert programmer with 20+ years of experience writing; you are very good at writing concise, clean, and efficient Python code. Your only job is to write concise function docstrings."
    docstring_prompt = f'Your responses should follow PEP conventions. A good docstring consists of a summary line, followed by a blank line, followed by a more elaborate description. The docstring for a function or method should summarize its behavior and document its arguments, return value(s), side effects, exceptions raised, and restrictions on when it can be called (all if applicable). Short and simple functions only need a one-liner docstring. Lines over 80 characters must be broken into a new line using \n. Here is an example of a simple function with a good docstring:\n    def complex(real=0.0, imag=0.0):\n        """Form a complex number.\n\n        Keyword arguments:\n        real -- the real part (default 0.0)\n        imag -- the imaginary part (default 0.0)\n        \n        if imag == 0.0 and real == 0.0:\n            return complex_zero"""\n'
    prompt = f"Generate a concise but informative docstring for the following function. You should just return the docstring and nothing else. Be as concise as possible. Function:\n\n{function_string}\n\n \n    "
    structure_prompt = "Your response should have the following structure:\n    {summary sentence that describes the function}\n\n    Args:\n        {param1}: {info about first parameter}\n        {param2}: {info about second parameter}\n        ...\n    \n    Returns:\n        {description of what is returned}\n    \n    Raises:\n        {any exceptions that could be raised}\n    "
    try:
        response = openai.ChatCompletion.create(
            model="gpt-3.5-turbo",
            messages=[
                {"role": "system", "content": context_prompt},
                {"role": "system", "content": docstring_prompt},
                {"role": "system", "content": structure_prompt},
                {"role": "user", "content": prompt},
            ],
            max_tokens=500,
        )
    except openai.error.APIError as e:
        if attempts > 3:
            raise e
        return generate_docstring(function_string, attempts + 1)
    except ConnectionResetError as e:
        if attempts > 3:
            raise e
        return generate_docstring(function_string, attempts + 1)
    except openai.error.RateLimitError as e:
        if attempts > 3:
            raise e
        print("Hit rate limit. Waiting 20 seconds")
        time.sleep(21)
        return generate_docstring(function_string, attempts + 1)
    docstring = response.choices[0].message.content
    return docstring


def add_docstring(function: ast.FunctionDef, is_retry=False) -> ast.FunctionDef:
    """Adds a docstring to the given AST function definition.

    Args:
        function (ast.FunctionDef): AST function definition needing a docstring.

    Returns:
        ast.FunctionDef: The input function definition with an added docstring.

    The function takes an AST function definition and adds a docstring to its starting lines. If a docstring already exists, the current one is replaced with a new one. If no parsed expression is in the newly generated docstring, the function raises a SyntaxError.

    Note: if the function definition contains quotes, the resultant docstring may have quote escape characters.
    """
    docstring = generate_docstring(ast.unparse(function))
    docstring = format_docstring(docstring)
    try:
        parsed_docstring = ast.parse(docstring).body[0]
        function.body.insert(0, parsed_docstring)
    except SyntaxError as e:
        if is_retry:
            print(docstring)
            raise e
        else:
            return add_docstring(function, is_retry=True)
    return function


def add_docstrings_to_file(file_path, format=False):
    """Add docstrings to all the functions in a python code file and update the file.

    file_path: directory path of the python file
    format: whether to format the code using black (default=True)

    This function takes in the path of a python code file and adds docstrings to all the functions available in the file. By using the abstract syntax tree module(ast) this function replaces the specified function definition with its docstring. The updated file is written back to the original filename with a formatted file(using black format) if format argument is True.
    Returns None"""
    print(file_path)
    with open(file_path, "r+") as file:
        source = file.read()
        module = ast.parse(source)
        ast.fix_missing_locations(module)
        for i, node in enumerate(module.body):
            if isinstance(node, ast.FunctionDef):
                if not ast.get_docstring(node):
                    if "__" not in node.name:
                        print("\t", node.name)
                        module.body[i] = add_docstring(node)
        file.seek(0)
        file.write(ast.unparse(module))
        file.truncate()
    if format:
        subprocess.run(["black", file_path], capture_output=True, check=True, text=True)


def document(path):
    """
    Add docstrings to all functions and classes in Python files within the specified directory.

    Args:
        path (str): Path of the directory where the Python files are located.

    Returns:
        None.

    The function processes each file in the specified directory and adds docstrings to all functions and classes contained within. The function checks if the file has a valid Python file extension and if it doesn't contain any dunder (__) characters in the filename. Once a valid file is identified, it proceeds to call the 'add_docstrings_to_file' function to add docstrings to each function and class contained within the file. The function does not return any values.
    """
    if os.path.isdir(path):
        for root, dirs, files in os.walk(path):
            for file_name in files:
                if fnmatch.fnmatch(file_name, "*.py"):
                    if "__" not in file_name:
                        file_path = os.path.join(root, file_name)
                        add_docstrings_to_file(file_path)
    else:
        add_docstrings_to_file(path)


import argparse


def main():
    """Parses command line arguments specifying a file or directory and then generates documentation.

    Args:
        file_path (str): path to the file or directory to be documented

    Returns:
        None

    Raises:
        FileNotFoundError: if file or directory not found
        ValueError: if file extension is not supported
    """
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "file_path", help="path to file or directory that you want to document"
    )
    args = parser.parse_args()
    document(args.file_path)


if __name__ == "__main__":
    main()
