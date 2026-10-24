#!/usr/bin/env python3
# SPDX-License-Identifier: GPL-3.0-or-later
"""Build only upstream lib_interface/SPPS, without desktop/Python bindings."""
import argparse, pathlib, subprocess
PIN='a0d4d4330d8c9894d31ce80e0fd3a9a1d4b872cb'
p=argparse.ArgumentParser();p.add_argument('--source',type=pathlib.Path,required=True);p.add_argument('--build',type=pathlib.Path,required=True);args=p.parse_args()
source=args.source.resolve();build=args.build.resolve()
head=subprocess.check_output(['git','-C',str(source),'rev-parse','HEAD'],text=True).strip()
if head!=PIN: raise SystemExit('Expected I-Simpa v1.3.4 commit '+PIN)
build.mkdir(parents=True,exist_ok=True)
wrapper=build/'wrapper';wrapper.mkdir(exist_ok=True)
(wrapper/'CMakeLists.txt').write_text('''cmake_minimum_required(VERSION 3.16)
project(revera_spps LANGUAGES CXX)
set(CMAKE_CXX_STANDARD 11)
enable_testing()
set(CMAKE_SOURCE_DIR "'''+source.as_posix()+'''")
include_directories("${CMAKE_SOURCE_DIR}/src/lib_interface")
add_subdirectory("${CMAKE_SOURCE_DIR}/src/lib_interface" lib_interface)
add_subdirectory("${CMAKE_SOURCE_DIR}/src/spps" spps)
''')
subprocess.run(['cmake','-S',str(wrapper),'-B',str(build/'native'),'-DCMAKE_BUILD_TYPE=Release','-DCMAKE_CXX_FLAGS=-include cstdint','-DCMAKE_POLICY_VERSION_MINIMUM=3.5'],check=True)
subprocess.run(['cmake','--build',str(build/'native'),'--target','spps','TEST_spps','-j2'],check=True)
subprocess.run(['ctest','--test-dir',str(build/'native'),'-R','spps_core_test','--output-on-failure'],check=True)
print(build/'native/spps/spps')
