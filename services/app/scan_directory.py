'''
This script is used to scan a directory for files and subdirectories.
It will save the paths of the dlls and gsc files to a JSON file named "<directory_name>.json".
'''
import os
import json
import argparse
import hashlib
import time
import datetime
import logging
import threading
import queue
import multiprocessing
import subprocess
import sys
import re
import struct
import ctypes
import winreg

def scan_directory(directory_path):
    '''
    Scan a directory for files and subdirectories.
    '''
    file_structure = {}
    for root, dirs, files in os.walk(directory_path):
        for file in files:
            if file.endswith('.dll') or file.endswith('.gsc'):
                file_path = os.path.join(root, file)
                file_structure[file_path] = file_path
    return file_structure

def save_file_paths(file_paths, file_name):
    '''
    Save the file structure to a JSON file.
    '''
    with open(file_name, 'w') as f:
        json.dump(file_paths, f)

def main():
    '''
    Main function.
    '''
    parser = argparse.ArgumentParser(description='Scan a directory for files and subdirectories.')
    parser.add_argument('directory_path', type=str, help='The directory to scan.')
    parser.add_argument('output_file', type=str, help='The output file name.')
    args = parser.parse_args()
    file_structure = scan_directory(args.directory_path)
    save_file_paths(file_structure, args.output_file)
    print(f'File paths saved to {args.output_file}')

if __name__ == '__main__':
    main()