# make        → ./invitation 빌드
# make run    → ../invitation.conf 로 실행
CXX ?= g++
CXXFLAGS ?= -std=c++17 -O2 -Wall -Wextra

invitation: invitation.cpp
	$(CXX) $(CXXFLAGS) -o $@ $<

run: invitation
	./invitation

clean:
	rm -f invitation
